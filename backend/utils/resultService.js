const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const { computeSemester, cgpa, divisionFor, round2 } = require('./grading');
const { rankStudents } = require('./ranking');
const { effectiveBySubject } = require('./attempts');
const settings = require('./settings');
const { sendMail } = require('./mailer');
const T = require('./emailTemplates');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
const newCode = () => Array.from(crypto.randomBytes(10), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
const termName = (program, term) => `${program.term_label} ${term + program.term_offset}`;

// Every sitting (regular exam + back papers) of the subjects of one term, for the students of one cohort.
// The cohort is whoever sat the REGULAR exam (attempt = 1) in `year`; back papers are later sittings of the same people.
const ATTEMPT_SQL = `SELECT m.student_id, s.id AS subject_id, s.code, s.name AS subject_name, s.credit, s.type, s.internal_full, s.external_full,
       m.internal_marks, m.external_marks, m.exam_year, m.attempt
  FROM marks m JOIN subjects s ON s.id = m.subject_id`;

async function cohortAttempts(run, programId, semester, year, studentId = null) {
  const sql = `${ATTEMPT_SQL}
   WHERE s.program_id = ? AND s.semester = ? AND m.exam_year >= ?
     AND m.student_id IN (SELECT m2.student_id FROM marks m2 JOIN subjects s2 ON s2.id = m2.subject_id
                           WHERE s2.program_id = ? AND s2.semester = ? AND m2.exam_year = ? AND m2.attempt = 1)
     ${studentId ? 'AND m.student_id = ?' : ''}
   ORDER BY m.student_id, s.code, m.exam_year, m.attempt`;
  const params = [programId, semester, year, programId, semester, year, ...(studentId ? [studentId] : [])];
  return run(sql, params);
}

// Recalculates GPA/grade/status/division and class ranks for one program + term + exam year.
// Back papers are folded in (a cleared subject replaces the failed attempt). Published flags and verification codes are preserved.
async function calculateResults(programId, semester, year) {
  return withTransaction(async (conn) => {
    const run = async (sql, params) => (await conn.query(sql, params))[0];
    const [program] = await run('SELECT * FROM programs WHERE id = ?', [programId]);
    if (!program) throw new Error('Program not found');
    const [{ n: subjectCount }] = await run('SELECT COUNT(*) n FROM subjects WHERE program_id = ? AND semester = ?', [programId, semester]);
    const attempts = await cohortAttempts(run, programId, semester, year);
    const eff = effectiveBySubject(attempts, program.grading_scheme, program.pass_percent);
    if (!eff.size) return { calculated: 0 };

    const ids = [...eff.keys()];
    const students = await run('SELECT id, student_name AS name FROM students WHERE id IN (?)', [ids]);
    const nameOf = new Map(students.map((s) => [s.id, s.name]));
    const rows = ids.map((id) => {
      const list = eff.get(id);
      const calc = computeSemester(list, program.grading_scheme, program.pass_percent);
      const status = list.length < subjectCount ? 'incomplete' : calc.status;
      return {
        student_id: id, name: nameOf.get(id), total_marks: calc.total, full_marks: calc.full, percentage: calc.percentage,
        total_credits: calc.credits, gpa: calc.gpa, grade: status === 'incomplete' ? '-' : calc.grade,
        division: status === 'incomplete' ? null : calc.division, status, backpapers: list.filter((x) => x.cleared_by_backpaper).length,
      };
    });
    const ranked = rankStudents(rows);
    for (const r of ranked) {
      await conn.query(
        `INSERT INTO results (student_id, semester, exam_year, total_marks, full_marks, percentage, total_credits, gpa, grade, division, backpapers, status, class_rank, verify_code)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE total_marks=VALUES(total_marks), full_marks=VALUES(full_marks), percentage=VALUES(percentage),
           total_credits=VALUES(total_credits), gpa=VALUES(gpa), grade=VALUES(grade), division=VALUES(division), backpapers=VALUES(backpapers),
           status=VALUES(status), class_rank=VALUES(class_rank), calculated_at=NOW()`,
        [r.student_id, semester, year, r.total_marks, r.full_marks, r.percentage, r.total_credits, r.gpa, r.grade, r.division, r.backpapers, r.status, r.class_rank, newCode()]);
    }
    return { calculated: ranked.length };
  });
}

// Marks a batch published/unpublished. When publishing with notify=true, queues one email per student (and guardian).
async function setPublished(programId, semester, year, publish, notify) {
  const r = await query(
    `UPDATE results r JOIN students s ON s.id = r.student_id
        SET r.published = ?, r.published_at = ${publish ? 'NOW()' : 'NULL'}
      WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? AND r.status <> 'incomplete'`,
    [publish ? 1 : 0, programId, semester, year]);
  let queued = 0;
  if (publish && notify) queued = await notifyResults(programId, semester, year);
  return { affected: r.affectedRows, queued };
}

async function notifyResults(programId, semester, year) {
  const inst = await settings.getAll();
  const [program] = await query('SELECT * FROM programs WHERE id = ?', [programId]);
  const rows = await query(
    `SELECT r.*, s.student_name, s.guardian_email, u.email FROM results r JOIN students s ON s.id = r.student_id JOIN users u ON u.id = s.user_id
      WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? AND r.published = 1`, [programId, semester, year]);
  const classSize = rows.filter((r) => r.status !== 'incomplete').length;
  let n = 0;
  for (const r of rows) {
    const d = {
      name: r.student_name, programName: program.name, termName: termName(program, semester), examYear: year, status: r.status, gpa: r.gpa,
      grade: r.grade, percentage: r.percentage, rank: r.class_rank, classSize, division: r.division, verifyCode: r.verify_code,
      verifyUrl: `${inst.app_url}/verify/${r.verify_code}`, link: `${inst.app_url}/student/results`,
    };
    const m = T.result(inst, d);
    if (await sendMail({ to: r.email, subject: m.subject, html: m.html, kind: 'result' })) n++;
    if (r.guardian_email) {
      const g = T.guardian(inst, d);
      if (await sendMail({ to: r.guardian_email, subject: g.subject, html: g.html, kind: 'result' })) n++;
    }
  }
  return n;
}

// Full marksheet (subject-wise, with back-paper history) for one student/term/year.
async function marksheet(studentId, semester, year) {
  const [student] = await query(
    `SELECT s.*, u.email, p.name AS program_name, p.code AS program_code, p.grading_scheme, p.pass_percent, p.term_label, p.term_offset
       FROM students s JOIN users u ON u.id = s.user_id JOIN programs p ON p.id = s.program_id WHERE s.id = ?`, [studentId]);
  if (!student) return null;
  const attempts = await cohortAttempts(query, student.program_id, semester, year, studentId);
  const rows = effectiveBySubject(attempts, student.grading_scheme, student.pass_percent).get(studentId) || [];
  const calc = computeSemester(rows, student.grading_scheme, student.pass_percent);
  const [result] = await query('SELECT * FROM results WHERE student_id=? AND semester=? AND exam_year=?', [studentId, semester, year]);
  const [{ n: classSize }] = await query(
    `SELECT COUNT(*) n FROM results r JOIN students s ON s.id = r.student_id WHERE s.program_id = ? AND r.semester=? AND r.exam_year=? AND r.status<>'incomplete'`,
    [student.program_id, semester, year]);
  return {
    student, semester, term_name: `${student.term_label} ${semester + student.term_offset}`, exam_year: year,
    subjects: calc.subjects, summary: calc, result: result || null, class_size: classSize, institution: await settings.getAll(),
    backpapers: calc.subjects.filter((s) => s.cleared_by_backpaper).length,
  };
}

// Cumulative transcript: every (published, unless staff) term, CGPA, final division and the open backlog list.
async function transcript(studentId, { includeDraft = false } = {}) {
  const [student] = await query(
    `SELECT s.*, u.email, p.name AS program_name, p.grading_scheme, p.pass_percent, p.term_label, p.term_offset, p.term_count
       FROM students s JOIN users u ON u.id = s.user_id JOIN programs p ON p.id = s.program_id WHERE s.id = ?`, [studentId]);
  if (!student) return null;
  const results = await query(
    `SELECT * FROM results WHERE student_id = ? ${includeDraft ? '' : 'AND published = 1'} AND status <> 'incomplete' ORDER BY semester, exam_year`, [studentId]);
  const terms = [];
  for (const r of results) {
    const attempts = await cohortAttempts(query, student.program_id, r.semester, r.exam_year, studentId);
    const rows = effectiveBySubject(attempts, student.grading_scheme, student.pass_percent).get(studentId) || [];
    const calc = computeSemester(rows, student.grading_scheme, student.pass_percent);
    terms.push({ ...r, term_name: `${student.term_label} ${r.semester + student.term_offset}`, subjects: calc.subjects });
  }
  const backlogs = [];
  terms.forEach((t) => t.subjects.forEach((s) => { if (!s.passed) backlogs.push({ subject_id: s.subject_id, code: s.code, subject_name: s.subject_name, term_name: t.term_name, semester: t.semester, exam_year: t.exam_year, percent: s.percent, attempts: s.attempts }); }));
  const counted = terms.filter((t) => t.status !== 'incomplete');
  const totalFull = counted.reduce((a, t) => a + Number(t.full_marks), 0);
  const overallPct = totalFull ? round2((counted.reduce((a, t) => a + Number(t.total_marks), 0) / totalFull) * 100) : 0;
  return {
    student, terms, backlogs, cgpa: cgpa(counted), overall_percentage: overallPct,
    backpapers_cleared: terms.reduce((a, t) => a + t.subjects.filter((s) => s.cleared_by_backpaper).length, 0),
    final_division: counted.length && !backlogs.length ? divisionFor(overallPct) : null,
    completed: counted.length === student.term_count && !backlogs.length, institution: await settings.getAll(),
  };
}

// Students who still have to clear `subject` (their effective attempt fails), with their previous sittings.
async function backPaperCandidates(subject, program) {
  const rows = await query(
    `SELECT m.student_id, s.id AS subject_id, s.credit, s.internal_full, s.external_full, m.internal_marks, m.external_marks, m.exam_year, m.attempt,
            st.roll_no, st.student_name, st.batch
       FROM marks m JOIN subjects s ON s.id = m.subject_id JOIN students st ON st.id = m.student_id
      WHERE s.id = ? ORDER BY st.roll_no, m.exam_year, m.attempt`, [subject.id]);
  const eff = effectiveBySubject(rows, program.grading_scheme, program.pass_percent);
  const meta = new Map(rows.map((r) => [r.student_id, r]));
  const out = [];
  eff.forEach((list, sid) => {
    const e = list[0];
    if (!e.passed) out.push({ student_id: sid, roll_no: meta.get(sid).roll_no, student_name: meta.get(sid).student_name, batch: meta.get(sid).batch, attempts: e.attempts, history: e.history, last_year: e.history[e.history.length - 1].exam_year });
  });
  return out;
}

module.exports = { calculateResults, setPublished, notifyResults, marksheet, transcript, termName, newCode, backPaperCandidates };
