// Back papers (re-sits). A subject can be attempted more than once; the effective attempt is the first PASSING
// one, otherwise the most recent. A student who passed first time is never affected by a later sitting.
const { evaluateSubject } = require('./grading');

function pickEffective(attempts, scheme, passPercent) {
  const sorted = [...attempts].sort((a, b) => a.exam_year - b.exam_year || a.attempt - b.attempt);
  const evals = sorted.map((a) => ({ ...a, ...evaluateSubject(a, scheme, passPercent) }));
  const firstPass = evals.findIndex((e) => e.passed);
  const idx = firstPass >= 0 ? firstPass : evals.length - 1;
  const eff = evals[idx];
  return {
    ...eff,
    attempt_no: idx + 1,                         // which sitting counts (1 = regular exam)
    attempts: evals.length,
    first_percent: evals[0].percent,
    first_grade: evals[0].grade,
    cleared_by_backpaper: idx > 0 && eff.passed,
    history: evals.map((e) => ({ attempt: e.attempt, exam_year: e.exam_year, percent: e.percent, grade: e.grade, passed: e.passed })),
  };
}

// rows: every attempt of every subject for one student (or many); returns effective rows grouped by student.
function effectiveBySubject(rows, scheme, passPercent) {
  const by = new Map();
  rows.forEach((r) => { const k = `${r.student_id}:${r.subject_id}`; if (!by.has(k)) by.set(k, []); by.get(k).push(r); });
  const out = new Map();
  by.forEach((list) => {
    const e = pickEffective(list, scheme, passPercent);
    if (!out.has(list[0].student_id)) out.set(list[0].student_id, []);
    out.get(list[0].student_id).push(e);
  });
  return out;
}

module.exports = { pickEffective, effectiveBySubject };
