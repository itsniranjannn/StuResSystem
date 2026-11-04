const router = require('express').Router();
const { query, withTransaction, audit } = require('../config/db');
const { authenticate, requireRole, wrap } = require('../middleware/auth');
const { saveMarks, saveBackPapers, parseCsv } = require('../utils/marksService');
const { backPaperCandidates } = require('../utils/resultService');
const { cohortInsights } = require('../utils/insights');
const { examYear, batchFor } = require('../utils/terms');
const A = require('../utils/algorithms');

router.use(authenticate, requireRole('teacher', 'admin'));
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });

// Loads a subject (+ program rules) and checks ownership (admins may act on any subject).
async function ownedSubject(req, res) {
  const [subject] = await query(
    `SELECT s.*, t.user_id AS teacher_user_id, p.terms_per_year, p.term_label, p.term_offset, p.code AS program, p.attendance_required, p.grading_scheme, p.pass_percent
       FROM subjects s JOIN programs p ON p.id = s.program_id LEFT JOIN teachers t ON t.id = s.teacher_id WHERE s.id = ?`, [req.params.id]);
  if (!subject) { bad(res, 'Subject not found', 404); return null; }
  if (req.user.role === 'teacher' && subject.teacher_user_id !== req.user.id) { bad(res, 'This subject is not assigned to you', 403); return null; }
  return subject;
}

router.get('/subjects', wrap(async (req, res) => res.json({ success: true, subjects: await query(
  `SELECT s.*, p.code AS program, p.term_label, p.term_offset,
          (SELECT COUNT(*) FROM marks m WHERE m.subject_id = s.id AND m.attempt = 1) entries,
          (SELECT COUNT(*) FROM students st WHERE st.program_id = s.program_id AND st.semester = s.semester) expected,
          (SELECT COUNT(DISTINCT m.student_id) FROM marks m JOIN students st ON st.id = m.student_id WHERE m.subject_id = s.id AND st.program_id = s.program_id AND st.semester = s.semester) entered,
          (SELECT COUNT(DISTINCT a.att_date) FROM attendance a WHERE a.subject_id = s.id) class_days,
          (SELECT MAX(a.att_date) FROM attendance a WHERE a.subject_id = s.id) last_attendance,
          (SELECT ROUND(AVG((m.internal_marks+m.external_marks)/(s.internal_full+s.external_full)*100),1) FROM marks m WHERE m.subject_id = s.id) avg_percent
     FROM subjects s JOIN programs p ON p.id = s.program_id JOIN teachers t ON t.id = s.teacher_id
    WHERE (? = 'admin' OR t.user_id = ?) ORDER BY s.program_id, s.semester, s.code`, [req.user.role, req.user.id]) })));

// Students who sit this subject in a given exam year (same program, cohort = year - term offset).
async function rosterFor(subject, year) {
  const batch = batchFor(year, subject.semester, subject.terms_per_year);
  return { batch, rows: await query('SELECT id, roll_no, student_name FROM students WHERE program_id = ? AND batch = ? AND semester >= ? ORDER BY roll_no', [subject.program_id, batch, subject.semester]) };
}

async function pickYear(subject, requested) {
  const cohorts = await query('SELECT DISTINCT batch FROM students WHERE program_id = ? AND semester >= ? AND batch IS NOT NULL ORDER BY batch DESC', [subject.program_id, subject.semester]);
  const years = cohorts.map((c) => ({ year: examYear(c.batch, subject.semester, subject.terms_per_year), batch: c.batch }));
  let year = Number(requested);
  if (!year) {
    const [cur] = await query('SELECT batch FROM students WHERE program_id = ? AND semester = ? AND batch IS NOT NULL GROUP BY batch ORDER BY COUNT(*) DESC LIMIT 1', [subject.program_id, subject.semester]);
    year = cur ? examYear(cur.batch, subject.semester, subject.terms_per_year) : (years[0]?.year ?? new Date().getFullYear());
  }
  return { year, years };
}

router.get('/subjects/:id/marks', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const { year, years } = await pickYear(subject, req.query.year);
  const batch = batchFor(year, subject.semester, subject.terms_per_year);
  const roster = await query(
    `SELECT s.id AS student_id, s.roll_no, s.student_name, m.internal_marks, m.external_marks, COALESCE(r.published, 0) AS locked
       FROM students s LEFT JOIN marks m ON m.student_id = s.id AND m.subject_id = ? AND m.exam_year = ? AND m.attempt = 1
       LEFT JOIN results r ON r.student_id = s.id AND r.semester = ? AND r.exam_year = ?
      WHERE s.program_id = ? AND s.semester >= ? AND s.batch = ? ORDER BY s.roll_no`,
    [subject.id, year, subject.semester, year, subject.program_id, subject.semester, batch]);
  res.json({ success: true, subject, year, years, roster });
}));

router.put('/subjects/:id/marks', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const year = Number(req.body.year);
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!year || !entries.length) return bad(res, 'Nothing to save');
  const out = await saveMarks(subject, year, entries, req.user);
  if (out.errors.length) return bad(res, out.errors[0]);
  res.json({ success: true, ...out });
}));

// CSV import: columns symbol/roll, internal, external (header optional). Reports every row that could not be used.
router.post('/subjects/:id/marks/import', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const year = Number(req.body.year);
  const rows = parseCsv(String(req.body.csv || ''));
  if (!year || !rows.length) return bad(res, 'Paste or upload a CSV first');
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader = header.some((h) => /symbol|roll|internal|external/.test(h));
  const col = (re, fallback) => { const i = header.findIndex((h) => re.test(h)); return hasHeader && i >= 0 ? i : fallback; };
  const iRoll = col(/symbol|roll/, 0), iInt = col(/internal/, 1), iExt = col(/external/, 2);
  const { rows: students } = await rosterFor(subject, year);
  const byRoll = new Map(students.map((s) => [String(s.roll_no).trim().toLowerCase(), s]));
  const entries = [];
  const skipped = [];
  rows.slice(hasHeader ? 1 : 0).forEach((r, idx) => {
    const roll = String(r[iRoll] ?? '').trim();
    const s = byRoll.get(roll.toLowerCase());
    if (!s) { skipped.push(`Row ${idx + 1}: symbol "${roll}" is not in this class`); return; }
    entries.push({ student_id: s.id, label: `${roll}`, internal_marks: String(r[iInt] ?? '').trim(), external_marks: String(r[iExt] ?? '').trim() });
  });
  const out = await saveMarks(subject, year, entries, req.user);
  if (out.errors.length) return res.status(400).json({ success: false, message: `Nothing was saved. ${out.errors[0]}`, errors: out.errors.slice(0, 10), skipped });
  res.json({ success: true, ...out, skipped });
}));

// ---------- Back papers (re-sits) ----------
router.get('/subjects/:id/backpapers', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const candidates = await backPaperCandidates(subject, subject);
  const thisYear = new Date().getFullYear();
  res.json({ success: true, subject, candidates, suggested_year: Math.max(thisYear, ...candidates.map((c) => c.last_year + 1)), pass_percent: subject.pass_percent });
}));

router.put('/subjects/:id/backpapers', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const year = Number(req.body.year);
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!year || !entries.length) return bad(res, 'Choose the back paper year and enter at least one mark');
  const out = await saveBackPapers(subject, year, entries, req.user);
  if (out.errors.length) return bad(res, out.errors[0]);
  res.json({ success: true, ...out });
}));

// ---------- Attendance ----------
router.get('/subjects/:id/attendance', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const { year, years } = await pickYear(subject, req.query.year);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : new Date().toISOString().slice(0, 10);
  const batch = batchFor(year, subject.semester, subject.terms_per_year);
  const roster = await query(
    `SELECT s.id AS student_id, s.roll_no, s.student_name, a.status,
            (SELECT COUNT(*) FROM attendance x WHERE x.student_id = s.id AND x.subject_id = ?) total,
            (SELECT SUM(x.status='present') + 0.5 * SUM(x.status='late') FROM attendance x WHERE x.student_id = s.id AND x.subject_id = ?) credit
       FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.subject_id = ? AND a.att_date = ?
      WHERE s.program_id = ? AND s.semester = ? AND s.batch = ? ORDER BY s.roll_no`,
    [subject.id, subject.id, subject.id, date, subject.program_id, subject.semester, batch]);
  const days = await query('SELECT DISTINCT att_date FROM attendance WHERE subject_id = ? ORDER BY att_date DESC LIMIT 60', [subject.id]);
  res.json({ success: true, subject, year, years, date, days: days.map((d) => d.att_date), roster: roster.map((r) => ({ ...r, percent: r.total ? A.round((Number(r.credit) / r.total) * 100, 1) : null })) });
}));

router.put('/subjects/:id/attendance', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const { date, entries } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Array.isArray(entries) || !entries.length) return bad(res, 'Date and attendance entries are required');
  if (new Date(date) > new Date(Date.now() + 86400000)) return bad(res, 'Attendance cannot be marked for a future date');
  const valid = entries.filter((e) => ['present', 'absent', 'late'].includes(e.status));
  await withTransaction(async (conn) => {
    for (const e of valid) {
      await conn.query(
        `INSERT INTO attendance (student_id, subject_id, att_date, status, marked_by) VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`, [e.student_id, subject.id, date, e.status, req.user.id]);
    }
  });
  await audit(req.user, 'ATTENDANCE_SAVE', `${subject.code} ${date}: ${valid.length} students`);
  res.json({ success: true, saved: valid.length });
}));

// ---------- Subject analytics ----------
router.get('/subjects/:id/analytics', wrap(async (req, res) => {
  const subject = await ownedSubject(req, res);
  if (!subject) return;
  const year = Number(req.query.year);
  const full = subject.internal_full + subject.external_full;
  const rows = await query(
    `SELECT s.student_name, s.roll_no, (m.internal_marks + m.external_marks) AS total, m.internal_marks, m.external_marks
       FROM marks m JOIN students s ON s.id = m.student_id WHERE m.subject_id = ? AND m.exam_year = ? AND m.attempt = 1 ORDER BY total DESC`, [subject.id, year]);
  if (!rows.length) return res.json({ success: true, empty: true, subject });
  const pct = rows.map((r) => (r.total / full) * 100);
  const buckets = [['0-39', 0, 40], ['40-49', 40, 50], ['50-59', 50, 60], ['60-69', 60, 70], ['70-79', 70, 80], ['80-89', 80, 90], ['90-100', 90, 101]]
    .map(([label, lo, hi]) => ({ label, count: pct.filter((p) => p >= lo && p < hi).length }));
  const stats = A.describe(pct);
  res.json({
    success: true, subject, count: rows.length, average: A.round(stats.mean, 1), stats, highest: rows[0], lowest: rows[rows.length - 1],
    pass_rate: A.round((pct.filter((p) => p >= 40).length / pct.length) * 100, 0), buckets, top: A.topK(rows, 5, (r) => r.total),
    internal_external_correlation: subject.external_full > 0 ? A.pearson(rows.map((r) => Number(r.internal_marks)), rows.map((r) => Number(r.external_marks))) : null,
  });
}));

// Cohort-level insights (clusters, risk, toppers) for a program/term/year the teacher teaches.
router.get('/insights', wrap(async (req, res) => {
  const { program_id, semester, exam_year } = req.query;
  if (req.user.role === 'teacher') {
    const [own] = await query('SELECT 1 FROM subjects s JOIN teachers t ON t.id = s.teacher_id WHERE t.user_id = ? AND s.program_id = ? AND s.semester = ? LIMIT 1', [req.user.id, program_id, semester]);
    if (!own) return bad(res, 'You do not teach this term', 403);
  }
  res.json({ success: true, ...(await cohortInsights(Number(program_id), Number(semester), Number(exam_year))) });
}));

router.get('/cohorts', wrap(async (req, res) => res.json({ success: true, cohorts: await query(
  `SELECT DISTINCT p.id AS program_id, p.code AS program, p.term_label, p.term_offset, s.semester, r.exam_year
     FROM subjects s JOIN programs p ON p.id = s.program_id LEFT JOIN teachers t ON t.id = s.teacher_id
     JOIN students st ON st.program_id = p.id JOIN results r ON r.student_id = st.id AND r.semester = s.semester
    WHERE (? = 'admin' OR t.user_id = ?) AND r.status <> 'incomplete' ORDER BY r.exam_year DESC, p.id, s.semester DESC`, [req.user.role, req.user.id]) })));

module.exports = router;
