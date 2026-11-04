const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query, withTransaction, audit } = require('../config/db');
const { authenticate, requireRole, wrap } = require('../middleware/auth');
const { calculateResults, setPublished } = require('../utils/resultService');
const { cohortInsights, studentInsights } = require('../utils/insights');
const { sendMail, isConfigured, verifyConnection, processQueue, cfg } = require('../utils/mailer');
const T = require('../utils/emailTemplates');
const settings = require('../utils/settings');
const { examYear } = require('../utils/terms');

router.use(authenticate, requireRole('admin'));

const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const dateOnly = (d) => { if (!d) return null; const v = String(d).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
const strong = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Dashboard ----------
router.get('/dashboard', wrap(async (req, res) => {
  const pid = req.query.program_id || null;
  const [counts] = await query(`SELECT
    (SELECT COUNT(*) FROM students WHERE (? IS NULL OR program_id = ?)) students, (SELECT COUNT(*) FROM teachers) teachers,
    (SELECT COUNT(*) FROM subjects WHERE (? IS NULL OR program_id = ?)) subjects, (SELECT COUNT(*) FROM users WHERE role='teacher' AND is_active=0) pending_teachers,
    (SELECT COUNT(*) FROM results r JOIN students s ON s.id=r.student_id WHERE r.published=1 AND (? IS NULL OR s.program_id=?)) published_results,
    (SELECT COUNT(*) FROM results r JOIN students s ON s.id=r.student_id WHERE r.published=0 AND (? IS NULL OR s.program_id=?)) draft_results,
    (SELECT COUNT(*) FROM email_logs WHERE status='failed') mail_failed, (SELECT COUNT(*) FROM email_logs WHERE status='sent') mail_sent`, [pid, pid, pid, pid, pid, pid, pid, pid]);
  const perTerm = await query(`SELECT r.semester, COUNT(*) students, ROUND(AVG(r.gpa),2) avg_gpa, SUM(r.status='pass') passed, SUM(r.status='fail') failed
      FROM results r JOIN students s ON s.id=r.student_id WHERE r.status<>'incomplete' AND (? IS NULL OR s.program_id=?) GROUP BY r.semester ORDER BY r.semester`, [pid, pid]);
  const gradeDist = await query(`SELECT r.grade, COUNT(*) count FROM results r JOIN students s ON s.id=r.student_id WHERE r.status<>'incomplete' AND (? IS NULL OR s.program_id=?) GROUP BY r.grade ORDER BY MIN(100 - r.percentage)`, [pid, pid]);
  const topSubjects = await query(`SELECT s.code, s.name, ROUND(AVG((m.internal_marks+m.external_marks)/(s.internal_full+s.external_full)*100),1) avg_percent
      FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE (? IS NULL OR s.program_id=?) GROUP BY s.id ORDER BY avg_percent DESC LIMIT 5`, [pid, pid]);
  const [att] = await query(`SELECT ROUND(AVG(CASE WHEN a.status='present' THEN 100 WHEN a.status='late' THEN 50 ELSE 0 END),1) avg_attendance FROM attendance a JOIN students s ON s.id=a.student_id WHERE (? IS NULL OR s.program_id=?)`, [pid, pid]);
  const recent = await query('SELECT user_name, action, detail, created_at FROM audit_logs ORDER BY id DESC LIMIT 8');
  res.json({ success: true, counts, avg_attendance: att?.avg_attendance, perTerm, gradeDist, topSubjects, recent, mail: { configured: isConfigured() } });
}));

// ---------- Programs ----------
router.get('/programs', wrap(async (req, res) => res.json({ success: true, programs: await query(
  `SELECT p.*, (SELECT COUNT(*) FROM students s WHERE s.program_id=p.id) students, (SELECT COUNT(*) FROM subjects s WHERE s.program_id=p.id) subjects FROM programs p ORDER BY p.id`) })));
function validProgram(b) {
  return b.code && b.name && ['school', 'higher_secondary', 'bachelor', 'master'].includes(b.level) && ['tu_gpa', 'neb_gpa', 'division'].includes(b.grading_scheme)
    && b.term_label && b.term_count >= 1 && b.term_count <= 12 && b.pass_percent >= 20 && b.pass_percent <= 60 && b.terms_per_year >= 1 && b.terms_per_year <= 4;
}
router.post('/programs', wrap(async (req, res) => {
  const b = req.body;
  if (!validProgram(b)) return bad(res, 'Check the program details');
  const [d] = await query('SELECT id FROM programs WHERE code = ?', [b.code]);
  if (d) return bad(res, 'Program code already exists', 409);
  await query('INSERT INTO programs (code,name,level,grading_scheme,term_label,term_count,term_offset,terms_per_year,pass_percent,attendance_required) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [b.code, b.name, b.level, b.grading_scheme, b.term_label, b.term_count, b.term_offset || 0, b.terms_per_year, b.pass_percent, b.attendance_required ?? 80]);
  await audit(req.user, 'PROGRAM_CREATE', b.code);
  res.status(201).json({ success: true });
}));
router.put('/programs/:id', wrap(async (req, res) => {
  const b = req.body;
  if (!validProgram(b)) return bad(res, 'Check the program details');
  await query('UPDATE programs SET code=?, name=?, level=?, grading_scheme=?, term_label=?, term_count=?, term_offset=?, terms_per_year=?, pass_percent=?, attendance_required=? WHERE id=?',
    [b.code, b.name, b.level, b.grading_scheme, b.term_label, b.term_count, b.term_offset || 0, b.terms_per_year, b.pass_percent, b.attendance_required ?? 80, req.params.id]);
  await audit(req.user, 'PROGRAM_UPDATE', b.code);
  res.json({ success: true, note: 'Recalculate results of this program for the new rules to apply.' });
}));
router.delete('/programs/:id', wrap(async (req, res) => {
  const [{ n }] = await query('SELECT (SELECT COUNT(*) FROM students WHERE program_id=?) + (SELECT COUNT(*) FROM subjects WHERE program_id=?) n', [req.params.id, req.params.id]);
  if (n) return bad(res, 'Remove this program\'s students and subjects first', 409);
  await query('DELETE FROM programs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// ---------- Users ----------
router.patch('/users/:id/active', wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return bad(res, 'You cannot disable your own account');
  const active = req.body.is_active ? 1 : 0;
  const [u] = await query('SELECT name, email, role, is_active FROM users WHERE id = ?', [req.params.id]);
  await query('UPDATE users SET is_active = ? WHERE id = ?', [active, req.params.id]);
  if (active && u && u.role === 'teacher' && !u.is_active) {
    const m = T.approved(await settings.getAll(), { name: u.name });
    sendMail({ to: u.email, subject: m.subject, html: m.html, kind: 'approved' }).catch(() => {});
  }
  await audit(req.user, active ? 'USER_ENABLE' : 'USER_DISABLE', `user ${req.params.id}`);
  res.json({ success: true });
}));
router.post('/users/:id/reset-password', wrap(async (req, res) => {
  if (!strong(req.body.password)) return bad(res, 'Password needs 8+ characters with a letter and a number');
  await query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(req.body.password, 10), req.params.id]);
  await audit(req.user, 'USER_PASSWORD_RESET', `user ${req.params.id}`);
  res.json({ success: true });
}));
router.delete('/users/:id', wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return bad(res, 'You cannot delete your own account');
  await query('DELETE FROM users WHERE id = ?', [req.params.id]);
  await audit(req.user, 'USER_DELETE', `user ${req.params.id}`);
  res.json({ success: true });
}));

// ---------- Students ----------
router.get('/students', wrap(async (req, res) => {
  const { semester, program_id, q = '' } = req.query;
  const rows = await query(
    `SELECT s.*, u.email, u.is_active, p.code AS program, p.term_label, p.term_offset FROM students s JOIN users u ON u.id = s.user_id JOIN programs p ON p.id = s.program_id
      WHERE (? IS NULL OR s.semester = ?) AND (? IS NULL OR s.program_id = ?) AND (s.student_name LIKE ? OR s.roll_no LIKE ?) ORDER BY s.program_id, s.semester DESC, s.roll_no LIMIT 500`,
    [semester || null, semester || null, program_id || null, program_id || null, `%${q}%`, `%${q}%`]);
  res.json({ success: true, students: rows });
}));

router.post('/students', wrap(async (req, res) => {
  const { name, email, password, program_id, roll_no, reg_no, semester, batch, gender, father_name, guardian_email, address, phone, dob } = req.body;
  const [prog] = await query('SELECT * FROM programs WHERE id = ?', [program_id]);
  if (!prog) return bad(res, 'Choose a program');
  if (!name || !EMAIL_RE.test(email || '') || !roll_no || !(semester >= 1 && semester <= prog.term_count)) return bad(res, 'Name, valid email, symbol number and term are required');
  if (guardian_email && !EMAIL_RE.test(guardian_email)) return bad(res, 'Guardian email is not valid');
  if (!strong(password || 'Student@123')) return bad(res, 'Weak password');
  const [dupe] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  const [dupeRoll] = await query('SELECT id FROM students WHERE roll_no = ?', [roll_no]);
  if (dupe || dupeRoll) return bad(res, 'Email or symbol number already exists', 409);
  const hashed = await bcrypt.hash(password || 'Student@123', 10);
  await withTransaction(async (conn) => {
    const [u] = await conn.query('INSERT INTO users (name,email,password,role) VALUES (?,?,?,"student")', [name, email.toLowerCase(), hashed]);
    await conn.query(`INSERT INTO students (user_id,program_id,roll_no,reg_no,student_name,semester,batch,gender,father_name,guardian_email,address,phone,dob) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u.insertId, program_id, roll_no, reg_no || null, name, semester, batch || null, gender || null, father_name || null, guardian_email || null, address || null, phone || null, dateOnly(dob)]);
  });
  await audit(req.user, 'STUDENT_CREATE', `${name} (${roll_no})`);
  res.status(201).json({ success: true });
}));

router.put('/students/:id', wrap(async (req, res) => {
  const { name, email, roll_no, reg_no, semester, batch, gender, father_name, guardian_email, address, phone, dob } = req.body;
  if (!name || !roll_no || !(semester >= 1 && semester <= 12)) return bad(res, 'Name, symbol number and term are required');
  if (email && !EMAIL_RE.test(email)) return bad(res, 'Email is not valid');
  if (guardian_email && !EMAIL_RE.test(guardian_email)) return bad(res, 'Guardian email is not valid');
  const [dupe] = await query('SELECT id FROM students WHERE roll_no = ? AND id <> ?', [roll_no, req.params.id]);
  if (dupe) return bad(res, 'Symbol number already used', 409);
  if (email) {
    const [e] = await query('SELECT u.id FROM users u WHERE u.email = ? AND u.id <> (SELECT user_id FROM students WHERE id = ?)', [email.toLowerCase(), req.params.id]);
    if (e) return bad(res, 'Email already used by another account', 409);
  }
  await withTransaction(async (conn) => {
    await conn.query(`UPDATE students SET student_name=?, roll_no=?, reg_no=?, semester=?, batch=?, gender=?, father_name=?, guardian_email=?, address=?, phone=?, dob=? WHERE id=?`,
      [name, roll_no, reg_no || null, semester, batch || null, gender || null, father_name || null, guardian_email || null, address || null, phone || null, dateOnly(dob), req.params.id]);
    await conn.query('UPDATE users u JOIN students s ON s.user_id=u.id SET u.name=? WHERE s.id=?', [name, req.params.id]);
    if (email) await conn.query('UPDATE users u JOIN students s ON s.user_id=u.id SET u.email=? WHERE s.id=?', [email.toLowerCase(), req.params.id]);
  });
  await audit(req.user, 'STUDENT_UPDATE', `${name} (${roll_no})`);
  res.json({ success: true });
}));

// ---------- Teachers ----------
router.get('/teachers', wrap(async (req, res) => res.json({ success: true, teachers: await query(
  `SELECT t.id, t.teacher_name, t.department, t.qualification, t.phone, u.email, u.is_active, u.id AS user_id,
          (SELECT COUNT(*) FROM subjects s WHERE s.teacher_id = t.id) subject_count FROM teachers t JOIN users u ON u.id = t.user_id ORDER BY u.is_active, t.teacher_name`) })));

// ---------- Subjects ----------
router.get('/subjects', wrap(async (req, res) => res.json({ success: true, subjects: await query(
  `SELECT s.*, t.teacher_name, p.code AS program FROM subjects s JOIN programs p ON p.id = s.program_id LEFT JOIN teachers t ON t.id = s.teacher_id
    WHERE (? IS NULL OR s.semester = ?) AND (? IS NULL OR s.program_id = ?) ORDER BY s.program_id, s.semester, s.code`,
  [req.query.semester || null, req.query.semester || null, req.query.program_id || null, req.query.program_id || null]) })));
const validSubject = (b) => b.program_id && b.code && b.name && b.semester >= 1 && b.semester <= 12 && b.credit > 0 && b.credit <= 8
  && b.internal_full >= 0 && b.external_full >= 0 && Number(b.internal_full) + Number(b.external_full) > 0;
router.post('/subjects', wrap(async (req, res) => {
  const b = req.body;
  if (!validSubject(b)) return bad(res, 'Check program, code, name, term, credit and marks');
  const [dupe] = await query('SELECT id FROM subjects WHERE code = ?', [b.code]);
  if (dupe) return bad(res, 'Subject code already exists', 409);
  await query('INSERT INTO subjects (program_id,code,name,semester,credit,type,internal_full,external_full,teacher_id) VALUES (?,?,?,?,?,?,?,?,?)',
    [b.program_id, b.code, b.name, b.semester, b.credit, b.type || 'theory', b.internal_full, b.external_full, b.teacher_id || null]);
  await audit(req.user, 'SUBJECT_CREATE', b.code);
  res.status(201).json({ success: true });
}));
router.put('/subjects/:id', wrap(async (req, res) => {
  const b = req.body;
  if (!validSubject(b)) return bad(res, 'Check program, code, name, term, credit and marks');
  const [dupe] = await query('SELECT id FROM subjects WHERE code = ? AND id <> ?', [b.code, req.params.id]);
  if (dupe) return bad(res, 'Subject code already exists', 409);
  await query('UPDATE subjects SET program_id=?, code=?, name=?, semester=?, credit=?, type=?, internal_full=?, external_full=?, teacher_id=? WHERE id=?',
    [b.program_id, b.code, b.name, b.semester, b.credit, b.type || 'theory', b.internal_full, b.external_full, b.teacher_id || null, req.params.id]);
  await audit(req.user, 'SUBJECT_UPDATE', b.code);
  res.json({ success: true });
}));
router.delete('/subjects/:id', wrap(async (req, res) => {
  await query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
  await audit(req.user, 'SUBJECT_DELETE', `subject ${req.params.id}`);
  res.json({ success: true });
}));

// ---------- Results ----------
router.get('/results/batches', wrap(async (req, res) => res.json({ success: true, batches: await query(
  `SELECT p.id AS program_id, p.code AS program, p.term_label, p.term_offset, r.semester, r.exam_year, COUNT(*) students, SUM(r.status='pass') passed, SUM(r.status='fail') failed,
          SUM(r.status='incomplete') incomplete, ROUND(AVG(CASE WHEN r.status<>'incomplete' THEN r.gpa END),2) avg_gpa, SUM(r.published) published_count
     FROM results r JOIN students s ON s.id = r.student_id JOIN programs p ON p.id = s.program_id
    WHERE (? IS NULL OR p.id = ?) GROUP BY p.id, r.semester, r.exam_year ORDER BY r.exam_year DESC, p.id, r.semester DESC`, [req.query.program_id || null, req.query.program_id || null]) })));

router.post('/results/calculate', wrap(async (req, res) => {
  const { program_id, semester, exam_year } = req.body;
  if (!program_id || !(semester >= 1) || !exam_year) return bad(res, 'Program, term and exam year are required');
  const out = await calculateResults(Number(program_id), Number(semester), Number(exam_year));
  await audit(req.user, 'RESULT_CALCULATE', `prog ${program_id} term ${semester} / ${exam_year}: ${out.calculated}`);
  res.json({ success: true, ...out });
}));

router.post('/results/publish', wrap(async (req, res) => {
  const { program_id, semester, exam_year, publish = true, notify = false } = req.body;
  const out = await setPublished(Number(program_id), Number(semester), Number(exam_year), publish !== false, !!notify);
  await audit(req.user, publish !== false ? 'RESULT_PUBLISH' : 'RESULT_UNPUBLISH', `prog ${program_id} term ${semester} / ${exam_year}: ${out.affected} results, ${out.queued} emails queued`);
  res.json({ success: true, ...out });
}));

router.get('/results', wrap(async (req, res) => res.json({ success: true, results: await query(
  `SELECT r.*, s.student_name, s.roll_no FROM results r JOIN students s ON s.id = r.student_id
    WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? ORDER BY r.class_rank IS NULL, r.class_rank, s.student_name`, [req.query.program_id, req.query.semester, req.query.exam_year]) })));

router.get('/results/export.csv', wrap(async (req, res) => {
  const { program_id, semester, exam_year } = req.query;
  const rows = await query(
    `SELECT s.roll_no, s.student_name, r.total_marks, r.percentage, r.gpa, r.grade, r.division, r.status, r.class_rank, r.verify_code
       FROM results r JOIN students s ON s.id = r.student_id WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? ORDER BY r.class_rank IS NULL, r.class_rank`, [program_id, semester, exam_year]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Symbol No,Name,Total,Percentage,GPA,Grade,Division,Status,Rank,Verify Code', ...rows.map((r) => [r.roll_no, r.student_name, r.total_marks, r.percentage, r.gpa, r.grade, r.division, r.status, r.class_rank, r.verify_code].map(esc).join(','))].join('\n');
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="results-${program_id}-t${semester}-${exam_year}.csv"` }).send(csv);
}));

// Promote students who passed the given term to the next term (failed students stay: they have backlogs to clear).
router.post('/results/promote', wrap(async (req, res) => {
  const { program_id, semester, exam_year } = req.body;
  const [prog] = await query('SELECT * FROM programs WHERE id = ?', [program_id]);
  if (!prog) return bad(res, 'Program not found');
  if (Number(semester) >= prog.term_count) return bad(res, 'This is the final term: nothing to promote to');
  const r = await query(
    `UPDATE students s JOIN results x ON x.student_id = s.id SET s.semester = s.semester + 1
      WHERE s.program_id = ? AND s.semester = ? AND x.semester = ? AND x.exam_year = ? AND x.status = 'pass' AND x.published = 1`, [program_id, semester, semester, exam_year]);
  await audit(req.user, 'PROMOTE', `prog ${program_id} term ${semester} -> ${Number(semester) + 1}: ${r.affectedRows} students`);
  res.json({ success: true, promoted: r.affectedRows });
}));

// ---------- Insights ----------
router.get('/insights', wrap(async (req, res) => res.json({ success: true, ...(await cohortInsights(Number(req.query.program_id), Number(req.query.semester), Number(req.query.exam_year))) })));

// Email an academic-support alert to every medium/high risk student of a cohort (and their guardian).
router.post('/insights/alerts', wrap(async (req, res) => {
  const { program_id, semester, exam_year, min_level = 'medium' } = req.body;
  const data = await cohortInsights(Number(program_id), Number(semester), Number(exam_year));
  const inst = await settings.getAll();
  let queued = 0;
  for (const r of data.at_risk || []) {
    if (min_level === 'high' && r.risk.level !== 'high') continue;
    const [s] = await query('SELECT s.student_name, s.guardian_email, u.email FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ?', [r.student_id]);
    const m = T.risk(inst, { name: s.student_name, level: r.risk.level, reasons: r.risk.reasons });
    if (await sendMail({ to: s.email, subject: m.subject, html: m.html, kind: 'risk' })) queued++;
    if (s.guardian_email && await sendMail({ to: s.guardian_email, subject: m.subject, html: m.html, kind: 'risk' })) queued++;
  }
  await audit(req.user, 'RISK_ALERTS', `prog ${program_id} term ${semester}: ${queued} emails`);
  res.json({ success: true, queued });
}));

// ---------- Notices ----------
router.get('/notices', wrap(async (req, res) => res.json({ success: true, notices: await query('SELECT * FROM notices ORDER BY id DESC') })));
router.post('/notices', wrap(async (req, res) => {
  const { title, body, audience = 'all', email = false } = req.body;
  if (!title || !body) return bad(res, 'Title and message are required');
  await query('INSERT INTO notices (title, body, audience, created_by) VALUES (?,?,?,?)', [title, body, audience, req.user.id]);
  let queued = 0;
  if (email) {
    const inst = await settings.getAll();
    const users = await query(`SELECT email FROM users WHERE is_active = 1 AND role <> 'admin' AND (? = 'all' OR role = ?)`, [audience, audience]);
    const m = T.notice(inst, { title, body });
    for (const u of users) if (await sendMail({ to: u.email, subject: m.subject, html: m.html, kind: 'notice' })) queued++;
  }
  await audit(req.user, 'NOTICE_CREATE', `${title}${queued ? ` (${queued} emails)` : ''}`);
  res.status(201).json({ success: true, queued });
}));
router.delete('/notices/:id', wrap(async (req, res) => { await query('DELETE FROM notices WHERE id = ?', [req.params.id]); res.json({ success: true }); }));
router.get('/audit', wrap(async (req, res) => res.json({ success: true, logs: await query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200') })));

// ---------- Institution settings ----------
router.get('/settings', wrap(async (req, res) => res.json({ success: true, settings: await settings.getAll() })));
router.put('/settings', wrap(async (req, res) => {
  await settings.setMany(req.body || {});
  await audit(req.user, 'SETTINGS_UPDATE', 'institution settings');
  res.json({ success: true, settings: await settings.getAll() });
}));

// ---------- Mail center ----------
router.get('/mail', wrap(async (req, res) => {
  const c = cfg();
  const stats = await query('SELECT status, COUNT(*) n FROM email_logs GROUP BY status');
  const logs = await query('SELECT id, to_email, subject, kind, status, attempts, error, created_at, sent_at FROM email_logs ORDER BY id DESC LIMIT 100');
  res.json({ success: true, configured: isConfigured(), sender: c.user || null, host: c.host, stats: Object.fromEntries(stats.map((s) => [s.status, s.n])), logs });
}));
router.get('/mail/:id', wrap(async (req, res) => {
  const [m] = await query('SELECT id, to_email, subject, kind, status, html, error, attempts, created_at, sent_at FROM email_logs WHERE id = ?', [req.params.id]);
  if (!m) return bad(res, 'Message not found', 404);
  res.json({ success: true, message: m });
}));
router.post('/mail/verify', wrap(async (req, res) => res.json({ success: true, ...(await verifyConnection()) })));
router.post('/mail/test', wrap(async (req, res) => {
  const to = req.body.to || req.user.email;
  if (!EMAIL_RE.test(to)) return bad(res, 'Enter a valid address');
  const m = T.test(await settings.getAll());
  await sendMail({ to, subject: m.subject, html: m.html, kind: 'test' });
  res.json({ success: true, configured: isConfigured() });
}));
router.post('/mail/retry', wrap(async (req, res) => {
  if (!isConfigured()) return res.json({ success: true, requeued: 0, configured: false });
  // Demo addresses are never re-queued: they can not be delivered.
  const r = await query("UPDATE email_logs SET status='queued', attempts=0, error=NULL WHERE status IN ('failed','skipped') AND to_email NOT REGEXP '(^|[.@])(test|invalid|example|localhost)$' AND to_email NOT REGEXP '@example[.](com|org|net)$'");
  processQueue().catch(() => {});
  res.json({ success: true, requeued: r.affectedRows, configured: true });
}));

router.get('/exam-year', wrap(async (req, res) => {
  const [p] = await query('SELECT terms_per_year FROM programs WHERE id = ?', [req.query.program_id]);
  res.json({ success: true, exam_year: p ? examYear(req.query.batch, req.query.term, p.terms_per_year) : null });
}));

module.exports = router;
module.exports.studentInsights = studentInsights;
