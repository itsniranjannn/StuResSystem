// Daily class automation: weekly timetable, class diary (what was taught), assignments with submission tracking.
// Teachers manage their own subjects; admins manage everything; students see their current term only.
const router = require('express').Router();
const { query, audit } = require('../config/db');
const { authenticate, requireRole, wrap } = require('../middleware/auth');

router.use(authenticate);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const hhmm = (t) => String(t).slice(0, 5);
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const meStudent = async (uid) => (await query('SELECT id, program_id, semester FROM students WHERE user_id = ?', [uid]))[0];
const meTeacher = async (uid) => (await query('SELECT id FROM teachers WHERE user_id = ?', [uid]))[0];

// A subject the caller may manage: the assigned teacher, or any admin.
async function manageable(req, res, subjectId) {
  const [s] = await query('SELECT s.*, t.user_id AS teacher_user_id, p.code AS program, p.term_label, p.term_offset FROM subjects s JOIN programs p ON p.id = s.program_id LEFT JOIN teachers t ON t.id = s.teacher_id WHERE s.id = ?', [subjectId]);
  if (!s) { bad(res, 'Subject not found', 404); return null; }
  if (req.user.role === 'teacher' && s.teacher_user_id !== req.user.id) { bad(res, 'This subject is not assigned to you', 403); return null; }
  if (req.user.role === 'student') { bad(res, 'You do not have permission for this action', 403); return null; }
  return s;
}

// ---------------------------------------------------------------- timetable
router.get('/timetable', wrap(async (req, res) => {
  let where = '1=1'; const params = [];
  if (req.user.role === 'student') { const st = await meStudent(req.user.id); where = 's.program_id = ? AND s.semester = ?'; params.push(st.program_id, st.semester); }
  else if (req.user.role === 'teacher') { where = 't.user_id = ?'; params.push(req.user.id); }
  if (req.query.program_id && req.user.role === 'admin') { where += ' AND s.program_id = ?'; params.push(req.query.program_id); }
  if (req.query.semester && req.user.role === 'admin') { where += ' AND s.semester = ?'; params.push(req.query.semester); }
  const rows = await query(
    `SELECT tt.id, tt.subject_id, tt.weekday, tt.start_time, tt.end_time, tt.room, s.code, s.name AS subject_name, s.semester, p.code AS program, p.term_label, p.term_offset, t.teacher_name
       FROM timetable tt JOIN subjects s ON s.id = tt.subject_id JOIN programs p ON p.id = s.program_id LEFT JOIN teachers t ON t.id = s.teacher_id
      WHERE ${where} ORDER BY tt.weekday, tt.start_time`, params);
  res.json({ success: true, slots: rows.map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) })) });
}));

router.post('/timetable', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { subject_id, weekday, start_time, end_time, room } = req.body;
  const s = await manageable(req, res, subject_id); if (!s) return;
  if (!(Number.isInteger(Number(weekday)) && weekday >= 0 && weekday <= 6)) return bad(res, 'Choose a weekday');
  if (!TIME.test(start_time || '') || !TIME.test(end_time || '')) return bad(res, 'Enter times as HH:MM');
  if (end_time <= start_time) return bad(res, 'The class must end after it starts');
  // a teacher cannot be in two classes at once, and one cohort cannot have two classes at once
  const clash = await query(
    `SELECT s2.code, s2.teacher_id, s2.program_id, s2.semester FROM timetable tt JOIN subjects s2 ON s2.id = tt.subject_id
      WHERE tt.weekday = ? AND tt.start_time < ? AND tt.end_time > ? AND ((s2.teacher_id IS NOT NULL AND s2.teacher_id = ?) OR (s2.program_id = ? AND s2.semester = ?))`,
    [weekday, end_time, start_time, s.teacher_id, s.program_id, s.semester]);
  if (clash.length) return bad(res, `Clashes with ${clash[0].code} at that time (same teacher or same class)`, 409);
  await query('INSERT INTO timetable (subject_id, weekday, start_time, end_time, room) VALUES (?,?,?,?,?)', [subject_id, weekday, start_time, end_time, room || null]);
  await audit(req.user, 'TIMETABLE_ADD', `${s.code} day ${weekday} ${start_time}-${end_time}`);
  res.status(201).json({ success: true });
}));

router.delete('/timetable/:id', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const [slot] = await query('SELECT subject_id FROM timetable WHERE id = ?', [req.params.id]);
  if (!slot) return bad(res, 'Slot not found', 404);
  if (!(await manageable(req, res, slot.subject_id))) return;
  await query('DELETE FROM timetable WHERE id = ?', [req.params.id]);
  res.json({ success: true });
}));

// ---------------------------------------------------------------- today
router.get('/today', wrap(async (req, res) => {
  const day = new Date().getDay(); const d = today();
  let where; const params = [d, d, day];
  if (req.user.role === 'student') { const st = await meStudent(req.user.id); where = 's.program_id = ? AND s.semester = ?'; params.push(st.program_id, st.semester); }
  else if (req.user.role === 'teacher') { where = 't.user_id = ?'; params.push(req.user.id); }
  else where = '1=1';
  const rows = await query(
    `SELECT tt.id, tt.subject_id, tt.start_time, tt.end_time, tt.room, s.code, s.name AS subject_name, t.teacher_name,
            (SELECT cl.topic FROM class_logs cl WHERE cl.subject_id = s.id AND cl.log_date = ?) AS topic,
            (SELECT COUNT(*) FROM attendance a WHERE a.subject_id = s.id AND a.att_date = ?) AS attendance_marked
       FROM timetable tt JOIN subjects s ON s.id = tt.subject_id LEFT JOIN teachers t ON t.id = s.teacher_id
      WHERE tt.weekday = ? AND ${where} ORDER BY tt.start_time`, params);
  res.json({ success: true, date: d, weekday: day, classes: rows.map((r) => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) })) });
}));

// ---------------------------------------------------------------- class diary
router.get('/diary', wrap(async (req, res) => {
  let where; const params = [];
  if (req.user.role === 'student') { const st = await meStudent(req.user.id); where = 's.program_id = ? AND s.semester = ?'; params.push(st.program_id, st.semester); }
  else if (req.user.role === 'teacher') { where = 't.user_id = ?'; params.push(req.user.id); }
  else where = '1=1';
  if (req.query.subject_id) { where += ' AND s.id = ?'; params.push(req.query.subject_id); }
  const rows = await query(
    `SELECT cl.id, DATE_FORMAT(cl.log_date, '%Y-%m-%d') AS log_date, cl.topic, cl.notes, s.id AS subject_id, s.code, s.name AS subject_name FROM class_logs cl JOIN subjects s ON s.id = cl.subject_id LEFT JOIN teachers t ON t.id = s.teacher_id
      WHERE ${where} ORDER BY cl.log_date DESC, s.code LIMIT 60`, params);
  res.json({ success: true, logs: rows });
}));

router.put('/logs', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { subject_id, date, topic, notes } = req.body;
  const s = await manageable(req, res, subject_id); if (!s) return;
  if (!DATE.test(date || '')) return bad(res, 'Choose a date');
  if (date > today()) return bad(res, 'You cannot log a class in the future');
  if (!topic || !topic.trim()) return bad(res, 'Write what was taught');
  await query('INSERT INTO class_logs (subject_id, log_date, topic, notes, created_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE topic = VALUES(topic), notes = VALUES(notes), created_by = VALUES(created_by)',
    [subject_id, date, topic.trim().slice(0, 200), notes ? String(notes).slice(0, 2000) : null, req.user.id]);
  await audit(req.user, 'CLASS_LOG', `${s.code} ${date}`);
  res.json({ success: true });
}));

// ---------------------------------------------------------------- assignments
router.get('/assignments', wrap(async (req, res) => {
  if (req.user.role === 'student') {
    const st = await meStudent(req.user.id);
    const rows = await query(
      `SELECT a.id, a.title, a.description, DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date, a.max_marks, s.code, s.name AS subject_name, x.status, x.marks, x.feedback
         FROM assignments a JOIN subjects s ON s.id = a.subject_id LEFT JOIN assignment_status x ON x.assignment_id = a.id AND x.student_id = ?
        WHERE s.program_id = ? AND s.semester = ? ORDER BY a.due_date DESC, a.id DESC LIMIT 80`, [st.id, st.program_id, st.semester]);
    return res.json({ success: true, assignments: rows });
  }
  let where = '1=1'; const params = [];
  if (req.user.role === 'teacher') { where = 't.user_id = ?'; params.push(req.user.id); }
  if (req.query.subject_id) { where += ' AND s.id = ?'; params.push(req.query.subject_id); }
  const rows = await query(
    `SELECT a.id, a.subject_id, a.title, a.description, DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date, a.max_marks, s.code, s.name AS subject_name,
            (SELECT COUNT(*) FROM students st WHERE st.program_id = s.program_id AND st.semester = s.semester) AS class_size,
            (SELECT COUNT(*) FROM assignment_status x WHERE x.assignment_id = a.id AND x.status IN ('submitted','late')) AS handed_in
       FROM assignments a JOIN subjects s ON s.id = a.subject_id LEFT JOIN teachers t ON t.id = s.teacher_id WHERE ${where} ORDER BY a.due_date DESC, a.id DESC LIMIT 100`, params);
  res.json({ success: true, assignments: rows });
}));

router.post('/assignments', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const { subject_id, title, description, due_date, max_marks } = req.body;
  const s = await manageable(req, res, subject_id); if (!s) return;
  if (!title || !title.trim()) return bad(res, 'Give the assignment a title');
  if (!DATE.test(due_date || '')) return bad(res, 'Choose a due date');
  if (max_marks !== undefined && max_marks !== '' && max_marks !== null && !(Number(max_marks) > 0 && Number(max_marks) <= 100)) return bad(res, 'Maximum marks must be between 1 and 100');
  const r = await query('INSERT INTO assignments (subject_id, title, description, due_date, max_marks, created_by) VALUES (?,?,?,?,?,?)',
    [subject_id, title.trim().slice(0, 160), description ? String(description).slice(0, 4000) : null, due_date, max_marks ? Number(max_marks) : null, req.user.id]);
  await audit(req.user, 'ASSIGNMENT_CREATE', `${s.code}: ${title.trim().slice(0, 60)}`);
  res.status(201).json({ success: true, id: r.insertId });
}));

async function ownedAssignment(req, res) {
  const [a] = await query('SELECT a.*, s.program_id, s.semester FROM assignments a JOIN subjects s ON s.id = a.subject_id WHERE a.id = ?', [req.params.id]);
  if (!a) { bad(res, 'Assignment not found', 404); return null; }
  if (!(await manageable(req, res, a.subject_id))) return null;
  return a;
}

router.delete('/assignments/:id', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const a = await ownedAssignment(req, res); if (!a) return;
  await query('DELETE FROM assignments WHERE id = ?', [a.id]);
  res.json({ success: true });
}));

router.get('/assignments/:id/status', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const a = await ownedAssignment(req, res); if (!a) return;
  const roster = await query(
    `SELECT st.id AS student_id, st.roll_no, st.student_name, x.status, x.marks, x.feedback FROM students st
       LEFT JOIN assignment_status x ON x.assignment_id = ? AND x.student_id = st.id
      WHERE st.program_id = ? AND st.semester = ? ORDER BY st.roll_no`, [a.id, a.program_id, a.semester]);
  res.json({ success: true, assignment: a, roster });
}));

router.put('/assignments/:id/status', requireRole('teacher', 'admin'), wrap(async (req, res) => {
  const a = await ownedAssignment(req, res); if (!a) return;
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!entries.length) return bad(res, 'Nothing to save');
  let saved = 0;
  for (const e of entries) {
    if (!['submitted', 'late', 'missing'].includes(e.status)) continue;
    let marks = e.marks === '' || e.marks == null ? null : Number(e.marks);
    if (marks !== null && (!Number.isFinite(marks) || marks < 0 || (a.max_marks && marks > Number(a.max_marks)))) return bad(res, `Marks must be between 0 and ${a.max_marks ?? 100}`);
    await query('INSERT INTO assignment_status (assignment_id, student_id, status, marks, feedback) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status = VALUES(status), marks = VALUES(marks), feedback = VALUES(feedback)',
      [a.id, e.student_id, e.status, marks, e.feedback ? String(e.feedback).slice(0, 200) : null]);
    saved++;
  }
  res.json({ success: true, saved });
}));

module.exports = router;
