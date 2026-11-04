const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, withTransaction, audit } = require('../config/db');
const { authenticate, wrap } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');
const T = require('../utils/emailTemplates');
const settings = require('../utils/settings');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPassword = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });

async function profileOf(user) {
  const out = { id: user.id, name: user.name, email: user.email, role: user.role };
  if (user.role === 'student') {
    const [s] = await query(
      `SELECT s.id AS student_id, s.roll_no, s.reg_no, s.semester, s.batch, s.program_id, p.code AS program, p.name AS program_name, p.term_label, p.term_offset, p.term_count, p.grading_scheme
         FROM students s JOIN programs p ON p.id = s.program_id WHERE s.user_id = ?`, [user.id]);
    Object.assign(out, s);
  } else if (user.role === 'teacher') {
    const [t] = await query('SELECT id AS teacher_id, department, qualification FROM teachers WHERE user_id = ?', [user.id]);
    Object.assign(out, t);
  }
  return out;
}

router.get('/programs', wrap(async (req, res) => res.json({ success: true, programs: await query('SELECT * FROM programs ORDER BY id') })));
router.get('/institution', wrap(async (req, res) => {
  const s = await settings.getAll();
  res.json({ success: true, institution: settings.publicView(s) });
}));

router.post('/register', wrap(async (req, res) => {
  const { name, email, password, role = 'student', roll_no, reg_no, semester, program_id, department, qualification } = req.body;
  if (!name || name.trim().length < 3) return bad(res, 'Enter your full name');
  if (!EMAIL_RE.test(email || '')) return bad(res, 'Enter a valid email address');
  if (!strongPassword(password)) return bad(res, 'Password needs 8+ characters with a letter and a number');
  if (!['student', 'teacher'].includes(role)) return bad(res, 'Invalid role');
  let program = null;
  if (role === 'student') {
    [program] = await query('SELECT * FROM programs WHERE id = ?', [program_id]);
    if (!program) return bad(res, 'Choose your program');
    if (!roll_no || !(Number(semester) >= 1 && Number(semester) <= program.term_count)) return bad(res, `Symbol number and ${program.term_label.toLowerCase()} (1-${program.term_count}) are required`);
  }
  const [dupe] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (dupe) return bad(res, 'An account with this email already exists', 409);
  if (role === 'student') {
    const [r] = await query('SELECT id FROM students WHERE roll_no = ?', [roll_no.trim()]);
    if (r) return bad(res, 'This symbol number is already registered', 409);
  }
  const hashed = await bcrypt.hash(password, 10);
  const active = role === 'student' ? 1 : 0; // teachers need admin approval
  const userId = await withTransaction(async (conn) => {
    const [u] = await conn.query('INSERT INTO users (name,email,password,role,is_active) VALUES (?,?,?,?,?)', [name.trim(), email.toLowerCase(), hashed, role, active]);
    if (role === 'student') {
      const batch = new Date().getFullYear() - Math.ceil(Number(semester) / program.terms_per_year) + 1;
      await conn.query('INSERT INTO students (user_id,program_id,roll_no,reg_no,student_name,semester,batch) VALUES (?,?,?,?,?,?,?)', [u.insertId, program.id, roll_no.trim(), reg_no || null, name.trim(), Number(semester), batch]);
    } else {
      await conn.query('INSERT INTO teachers (user_id,teacher_name,department,qualification) VALUES (?,?,?,?)', [u.insertId, name.trim(), department || 'General', qualification || null]);
    }
    return u.insertId;
  });
  await audit({ id: userId, name }, 'REGISTER', `${role} ${email}`);
  if (!active) return res.status(201).json({ success: true, pending: true, message: 'Registered. An administrator must approve your teacher account before you can sign in.' });
  const inst = await settings.getAll();
  const m = T.welcome(inst, { name: name.trim(), role });
  sendMail({ to: email.toLowerCase(), subject: m.subject, html: m.html, kind: 'welcome' }).catch(() => {});
  const user = { id: userId, name: name.trim(), email: email.toLowerCase(), role };
  res.status(201).json({ success: true, token: sign(user), user: await profileOf(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [user] = await query('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
  if (!user || !(await bcrypt.compare(password || '', user.password))) return bad(res, 'Incorrect email or password', 401);
  if (!user.is_active) return bad(res, user.role === 'teacher' ? 'Your teacher account is awaiting admin approval' : 'This account has been disabled', 403);
  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
  await audit(user, 'LOGIN', user.email);
  res.json({ success: true, token: sign(user), user: await profileOf(user) });
}));

router.get('/me', authenticate, wrap(async (req, res) => res.json({ success: true, user: await profileOf(req.user) })));

router.put('/password', authenticate, wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  const [u] = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(current_password || '', u.password))) return bad(res, 'Current password is incorrect');
  if (!strongPassword(new_password)) return bad(res, 'New password needs 8+ characters with a letter and a number');
  await query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(new_password, 10), req.user.id]);
  await audit(req.user, 'PASSWORD_CHANGE', req.user.email);
  res.json({ success: true, message: 'Password updated' });
}));

router.post('/forgot-password', wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  const [user] = await query('SELECT id, name FROM users WHERE email = ? AND is_active = 1', [email]);
  const generic = { success: true, message: 'If that email is registered, a reset link has been sent.' };
  if (!user) return res.json(generic);
  const token = crypto.randomBytes(32).toString('hex');
  await query('UPDATE users SET reset_token_hash = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?', [crypto.createHash('sha256').update(token).digest('hex'), user.id]);
  const inst = await settings.getAll();
  const link = `${inst.app_url}/reset-password/${token}`;
  const m = T.reset(inst, { name: user.name, link });
  const logId = await sendMail({ to: email, subject: m.subject, html: m.html, kind: 'reset' });
  const [log] = await query('SELECT status FROM email_logs WHERE id = ?', [logId]);
  // Without a configured mailbox (local development) the link is returned so the flow stays testable.
  res.json(log?.status === 'skipped' ? { ...generic, dev_reset_link: link } : generic);
}));

router.post('/reset-password', wrap(async (req, res) => {
  const { token, password } = req.body;
  if (!strongPassword(password)) return bad(res, 'Password needs 8+ characters with a letter and a number');
  const hashed = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const [user] = await query('SELECT id FROM users WHERE reset_token_hash = ? AND reset_expires > NOW()', [hashed]);
  if (!user) return bad(res, 'This reset link is invalid or has expired');
  await query('UPDATE users SET password = ?, reset_token_hash = NULL, reset_expires = NULL WHERE id = ?', [await bcrypt.hash(password, 10), user.id]);
  await audit({ id: user.id, name: 'user' }, 'PASSWORD_RESET', `user ${user.id}`);
  res.json({ success: true, message: 'Password reset. You can sign in now.' });
}));

module.exports = router;
