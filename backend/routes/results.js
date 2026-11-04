const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, requireRole, wrap } = require('../middleware/auth');
const { marksheet, transcript } = require('../utils/resultService');
const { studentInsights, attendanceFor, overallAttendance } = require('../utils/insights');
const { cgpa } = require('../utils/grading');
const settings = require('../utils/settings');

const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });

// ---- Public endpoints (no sign-in) with a light in-memory rate limit ----
const hits = new Map();
const MAX_PUBLIC = Number(process.env.PUBLIC_RATE_LIMIT) || 40; // per IP per minute; raised only for automated test runs
function limit(req, res, next) {
  const now = Date.now();
  const arr = (hits.get(req.ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= MAX_PUBLIC) return bad(res, 'Too many requests, please wait a minute', 429);
  arr.push(now);
  hits.set(req.ip, arr);
  next();
}

router.get('/public/search', limit, wrap(async (req, res) => {
  const roll = String(req.query.roll_no || '').trim();
  if (!roll) return bad(res, 'Enter a symbol number');
  const [student] = await query(
    `SELECT s.id, s.student_name, s.roll_no, p.name AS program, p.term_label, p.term_offset FROM students s JOIN programs p ON p.id = s.program_id WHERE s.roll_no = ?`, [roll]);
  if (!student) return bad(res, 'No student found with that symbol number', 404);
  const results = await query(
    `SELECT semester, exam_year, gpa, grade, division, status, class_rank, percentage, verify_code FROM results WHERE student_id = ? AND published = 1 ORDER BY semester`, [student.id]);
  res.json({ success: true, student, results });
}));

router.get('/public/marksheet', limit, wrap(async (req, res) => {
  const [student] = await query('SELECT id FROM students WHERE roll_no = ?', [String(req.query.roll_no || '').trim()]);
  if (!student) return bad(res, 'No student found', 404);
  const [r] = await query('SELECT exam_year FROM results WHERE student_id=? AND semester=? AND published=1', [student.id, req.query.semester]);
  if (!r) return bad(res, 'Result not published', 404);
  res.json({ success: true, ...(await marksheet(student.id, Number(req.query.semester), r.exam_year)) });
}));

// Anyone can confirm a marksheet is genuine from the code printed on it (fights forged marksheets).
router.get('/public/verify/:code', limit, wrap(async (req, res) => {
  const [r] = await query(
    `SELECT r.semester, r.exam_year, r.gpa, r.grade, r.division, r.status, r.percentage, r.class_rank, r.published_at, s.student_name, s.roll_no, p.name AS program, p.term_label, p.term_offset
       FROM results r JOIN students s ON s.id = r.student_id JOIN programs p ON p.id = s.program_id WHERE r.verify_code = ? AND r.published = 1`, [String(req.params.code).toUpperCase().trim()]);
  if (!r) return res.json({ success: true, valid: false });
  res.json({ success: true, valid: true, result: { ...r, term_name: `${r.term_label} ${r.semester + r.term_offset}` }, institution: await settings.getAll() });
}));

router.get('/public/stats', wrap(async (req, res) => {
  const [s] = await query(`SELECT (SELECT COUNT(*) FROM students) students, (SELECT COUNT(*) FROM subjects) subjects, (SELECT COUNT(*) FROM programs) programs,
     (SELECT COUNT(*) FROM results WHERE published=1) results, (SELECT ROUND(AVG(gpa),2) FROM results WHERE published=1 AND status<>'incomplete') avg_gpa`);
  res.json({ success: true, stats: s, institution: await settings.getAll() });
}));

router.use(authenticate);

// ---- Student's own data ----
const myStudent = async (userId) => (await query(
  `SELECT s.*, p.name AS program_name, p.code AS program, p.term_label, p.term_offset, p.term_count, p.grading_scheme, p.attendance_required
     FROM students s JOIN programs p ON p.id = s.program_id WHERE s.user_id = ?`, [userId]))[0];

router.get('/me/overview', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  const results = await query(
    `SELECT r.*, (SELECT COUNT(*) FROM results x JOIN students sx ON sx.id = x.student_id WHERE sx.program_id = ? AND x.semester=r.semester AND x.exam_year=r.exam_year AND x.status<>'incomplete') class_size
       FROM results r WHERE r.student_id = ? AND r.published = 1 ORDER BY r.semester`, [st.program_id, st.id]);
  const counted = results.filter((r) => r.status !== 'incomplete');
  const pending = await query('SELECT semester, exam_year FROM results WHERE student_id = ? AND published = 0', [st.id]);
  const att = await attendanceFor(st.id);
  res.json({
    success: true, student: st, results, cgpa: cgpa(counted), credits: counted.reduce((a, r) => a + Number(r.total_credits), 0),
    backlog: counted.filter((r) => r.status === 'fail').length, pending: pending.length,
    attendance: { overall: overallAttendance(att), required: st.attendance_required },
  });
}));

router.get('/me/marksheet/:semester/:year', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  const [r] = await query('SELECT published FROM results WHERE student_id=? AND semester=? AND exam_year=?', [st.id, req.params.semester, req.params.year]);
  if (!r || !r.published) return bad(res, 'This result has not been published yet', 404);
  res.json({ success: true, ...(await marksheet(st.id, Number(req.params.semester), Number(req.params.year))) });
}));

router.get('/me/transcript', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  res.json({ success: true, ...(await transcript(st.id)) });
}));

router.get('/me/attendance', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  const subjects = await attendanceFor(st.id);
  const recent = await query(
    `SELECT a.att_date, a.status, s.code, s.name FROM attendance a JOIN subjects s ON s.id = a.subject_id WHERE a.student_id = ? ORDER BY a.att_date DESC, s.code LIMIT 60`, [st.id]);
  res.json({ success: true, required: st.attendance_required, overall: overallAttendance(subjects), subjects, recent });
}));

router.get('/me/insights', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  res.json({ success: true, ...(await studentInsights(st.id)), term_label: st.term_label, term_offset: st.term_offset });
}));

// Subject-wise percentage vs class average across published terms (radar / bar charts).
router.get('/me/analysis', requireRole('student'), wrap(async (req, res) => {
  const st = await myStudent(req.user.id);
  const rows = await query(
    `SELECT s.code, s.name, s.semester,
            ROUND((m.internal_marks+m.external_marks)/(s.internal_full+s.external_full)*100,1) AS percent,
            (SELECT ROUND(AVG((m2.internal_marks+m2.external_marks)/(s.internal_full+s.external_full)*100),1) FROM marks m2 WHERE m2.subject_id = s.id AND m2.exam_year = m.exam_year) AS class_avg
       FROM marks m JOIN subjects s ON s.id = m.subject_id
       JOIN results r ON r.student_id = m.student_id AND r.semester = s.semester AND r.exam_year = m.exam_year AND r.published = 1
      WHERE m.student_id = ? ORDER BY s.semester, s.code`, [st.id]);
  res.json({ success: true, subjects: rows, term_label: st.term_label, term_offset: st.term_offset });
}));

// ---- Rankings (everyone signed in; students only see published batches of their own program) ----
router.get('/available', wrap(async (req, res) => {
  const mine = req.user.role === 'student' ? await myStudent(req.user.id) : null;
  const rows = await query(
    `SELECT p.id AS program_id, p.code AS program, p.term_label, p.term_offset, r.semester, r.exam_year, COUNT(*) students
       FROM results r JOIN students s ON s.id = r.student_id JOIN programs p ON p.id = s.program_id
      WHERE r.status <> 'incomplete' ${mine ? 'AND r.published = 1 AND p.id = ?' : ''} GROUP BY p.id, r.semester, r.exam_year ORDER BY r.exam_year DESC, p.id, r.semester DESC`, mine ? [mine.program_id] : []);
  res.json({ success: true, batches: rows });
}));

router.get('/ranking', wrap(async (req, res) => {
  const programId = Number(req.query.program_id), semester = Number(req.query.semester), year = Number(req.query.exam_year);
  const staff = req.user.role !== 'student';
  const mine = staff ? null : await myStudent(req.user.id);
  if (mine && mine.program_id !== programId) return bad(res, 'You can only view rankings of your own program', 403);
  const rows = await query(
    `SELECT r.class_rank, r.gpa, r.grade, r.division, r.status, r.percentage, r.total_marks, r.published, s.student_name, s.roll_no, s.id AS student_id
       FROM results r JOIN students s ON s.id = r.student_id
      WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? AND r.status <> 'incomplete' ${staff ? '' : 'AND r.published = 1'}
      ORDER BY r.class_rank, s.student_name`, [programId, semester, year]);
  res.json({ success: true, ranking: rows, me: mine?.id ?? null });
}));

// ---- Staff views of a single student ----
router.get('/marksheet/:studentId/:semester/:year', requireRole('admin', 'teacher'), wrap(async (req, res) => {
  const sheet = await marksheet(Number(req.params.studentId), Number(req.params.semester), Number(req.params.year));
  if (!sheet) return bad(res, 'Student not found', 404);
  res.json({ success: true, ...sheet });
}));
router.get('/transcript/:studentId', requireRole('admin', 'teacher'), wrap(async (req, res) => {
  const t = await transcript(Number(req.params.studentId), { includeDraft: true });
  if (!t) return bad(res, 'Student not found', 404);
  res.json({ success: true, ...t });
}));
router.get('/student-insights/:studentId', requireRole('admin', 'teacher'), wrap(async (req, res) => {
  res.json({ success: true, ...(await studentInsights(Number(req.params.studentId), { includeDraft: true })) });
}));

// ---- Notices ----
router.get('/notices', wrap(async (req, res) => res.json({ success: true, notices: await query(
  `SELECT id, title, body, audience, created_at FROM notices WHERE audience IN ('all', ?) OR ? = 'admin' ORDER BY id DESC LIMIT 20`, [req.user.role, req.user.role]) })));

module.exports = router;
