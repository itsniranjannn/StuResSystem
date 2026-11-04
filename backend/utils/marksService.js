const { query, withTransaction, audit } = require('../config/db');
const { calculateResults, backPaperCandidates } = require('./resultService');
const { evaluateSubject } = require('./grading');
const { examYear } = require('./terms');

// Validates and upserts marks for one subject + exam year. Published results are locked and skipped.
// Returns { saved, skipped_locked, errors[] }.  Invalid rows are reported, never silently dropped.
async function saveMarks(subject, year, entries, user) {
  const errors = [];
  const clean = [];
  for (const e of entries) {
    if (e.internal_marks === '' || e.internal_marks == null) continue; // not entered yet
    const hasExt = subject.external_full > 0;
    if (hasExt && (e.external_marks === '' || e.external_marks == null)) continue;
    const i = Number(e.internal_marks);
    const x = hasExt ? Number(e.external_marks) : 0;
    const label = e.label || `student ${e.student_id}`;
    if (!Number.isFinite(i) || i < 0 || i > subject.internal_full) errors.push(`${label}: internal must be 0-${subject.internal_full}`);
    else if (!Number.isFinite(x) || x < 0 || x > subject.external_full) errors.push(`${label}: external must be 0-${subject.external_full}`);
    else clean.push([Number(e.student_id), i, x]);
  }
  if (errors.length) return { saved: 0, skipped_locked: 0, errors };
  const ids = clean.map((c) => c[0]);
  const locked = ids.length
    ? await query('SELECT student_id FROM results WHERE published = 1 AND semester = ? AND exam_year = ? AND student_id IN (?)', [subject.semester, year, ids])
    : [];
  const lockedSet = new Set(locked.map((l) => l.student_id));
  const toSave = clean.filter((c) => !lockedSet.has(c[0]));
  await withTransaction(async (conn) => {
    for (const [sid, i, x] of toSave) {
      await conn.query(
        `INSERT INTO marks (student_id, subject_id, exam_year, internal_marks, external_marks, entered_by) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE internal_marks = VALUES(internal_marks), external_marks = VALUES(external_marks), entered_by = VALUES(entered_by)`,
        [sid, subject.id, year, i, x, user.id]);
    }
  });
  if (toSave.length) await calculateResults(subject.program_id, subject.semester, year);
  await audit(user, 'MARKS_SAVE', `${subject.code} / ${year}: ${toSave.length} saved, ${lockedSet.size} locked`);
  return { saved: toSave.length, skipped_locked: lockedSet.size, errors: [] };
}

// Tiny CSV parser (quotes, commas, CRLF). Header: symbol/roll, internal, external (any order, case-insensitive).
function parseCsv(text) {
  const rows = [];
  let cur = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t') { cur.push(field); field = ''; }
    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Back papers: a new sitting of a subject the student has not yet cleared. Allowed even after results are published
// (that is the point of a back paper); the original result row is recalculated and stays published.
async function saveBackPapers(subject, year, entries, user) {
  const errors = [];
  const cands = new Map((await backPaperCandidates(subject, subject)).map((c) => [c.student_id, c]));
  const saved = [];
  for (const e of entries) {
    if (e.internal_marks === '' || e.internal_marks == null) continue;
    const c = cands.get(Number(e.student_id));
    const label = e.label || `student ${e.student_id}`;
    if (!c) { errors.push(`${label}: has no pending back paper in this subject`); continue; }
    if (!(Number(year) > c.last_year)) { errors.push(`${label}: back paper year must be after ${c.last_year}`); continue; }
    const hasExt = subject.external_full > 0;
    if (hasExt && (e.external_marks === '' || e.external_marks == null)) continue;
    const i = Number(e.internal_marks); const x = hasExt ? Number(e.external_marks) : 0;
    if (!Number.isFinite(i) || i < 0 || i > subject.internal_full) { errors.push(`${label}: internal must be 0-${subject.internal_full}`); continue; }
    if (!Number.isFinite(x) || x < 0 || x > subject.external_full) { errors.push(`${label}: external must be 0-${subject.external_full}`); continue; }
    saved.push({ c, i, x });
  }
  if (errors.length) return { saved: 0, results: [], errors };
  await withTransaction(async (conn) => {
    for (const { c, i, x } of saved) {
      await conn.query(
        `INSERT INTO marks (student_id, subject_id, exam_year, attempt, internal_marks, external_marks, entered_by) VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE internal_marks = VALUES(internal_marks), external_marks = VALUES(external_marks), entered_by = VALUES(entered_by)`,
        [c.student_id, subject.id, Number(year), c.attempts + 1, i, x, user.id]);
    }
  });
  // recalculate the original result of every affected student (their regular-exam year)
  const origins = new Set(saved.map(({ c }) => examYear(c.batch, subject.semester, subject.terms_per_year)));
  for (const y of origins) await calculateResults(subject.program_id, subject.semester, y);
  const results = saved.map(({ c, i, x }) => {
    const ev = evaluateSubject({ internal_marks: i, external_marks: x, internal_full: subject.internal_full, external_full: subject.external_full, credit: subject.credit }, subject.grading_scheme, subject.pass_percent);
    return { student_id: c.student_id, passed: ev.passed, grade: ev.grade, percent: ev.percent };
  });
  await audit(user, 'BACKPAPER_SAVE', `${subject.code} / ${year}: ${saved.length} students, ${results.filter((r) => r.passed).length} cleared`);
  return { saved: saved.length, results, errors: [] };
}

module.exports = { saveMarks, saveBackPapers, parseCsv };
