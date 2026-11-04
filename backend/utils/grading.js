// Grading engine with three pluggable schemes so any Nepali institution can use it:
//   tu_gpa   Tribhuvan University semester GPA (4.0 scale, letter grades A..D)
//   neb_gpa  NEB / SEE style grade points (A+ 4.0 .. D 1.6, NG = not graded)
//   division percentage divisions (Distinction / First / Second / Pass) for annual systems
// The pass percentage is a per-program setting (TU 40, NEB 35 ...). Scales follow the published
// schemes as best known; they are data (below), so a campus can adjust them in one place.
const round2 = (n) => Math.round(n * 100) / 100;

const SCALES = {
  tu_gpa: [
    { min: 0, grade: 'F', point: 0.0 }, { min: 40, grade: 'D', point: 1.0 }, { min: 45, grade: 'D+', point: 1.3 },
    { min: 50, grade: 'C-', point: 1.7 }, { min: 55, grade: 'C', point: 2.0 }, { min: 60, grade: 'C+', point: 2.3 },
    { min: 65, grade: 'B-', point: 2.7 }, { min: 70, grade: 'B', point: 3.0 }, { min: 75, grade: 'B+', point: 3.3 },
    { min: 80, grade: 'A-', point: 3.7 }, { min: 90, grade: 'A', point: 4.0 },
  ],
  neb_gpa: [
    { min: 0, grade: 'NG', point: 0.0 }, { min: 35, grade: 'D', point: 1.6 }, { min: 40, grade: 'C', point: 2.0 },
    { min: 50, grade: 'C+', point: 2.4 }, { min: 60, grade: 'B', point: 2.8 }, { min: 70, grade: 'B+', point: 3.2 },
    { min: 80, grade: 'A', point: 3.6 }, { min: 90, grade: 'A+', point: 4.0 },
  ],
  // For the division scheme a subject grade is its band; point = percentage on a 4.0 scale.
  division: [
    { min: 0, grade: 'F', point: 0 }, { min: 40, grade: 'P', point: 0 }, { min: 48, grade: '2nd', point: 0 },
    { min: 60, grade: '1st', point: 0 }, { min: 80, grade: 'Dist.', point: 0 },
  ],
};

const DIVISIONS = [
  { min: 80, label: 'Distinction' }, { min: 60, label: 'First Division' }, { min: 48, label: 'Second Division' }, { min: 40, label: 'Pass Division' },
];

// Binary search over an ascending scale: largest band whose min <= percent.  O(log n)
function bandFor(scale, percent) {
  let lo = 0;
  let hi = scale.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (scale[mid].min <= percent) lo = mid; else hi = mid - 1;
  }
  return scale[lo];
}

const gradeFor = (percent, scheme = 'tu_gpa') => bandFor(SCALES[scheme], percent);
const divisionFor = (percent) => DIVISIONS.find((d) => percent >= d.min)?.label || 'Fail';

// A subject passes with >= passPercent overall and >= passPercent of the external component.
function evaluateSubject(row, scheme = 'tu_gpa', passPercent = 40) {
  const intFull = Number(row.internal_full);
  const extFull = Number(row.external_full);
  const full = intFull + extFull;
  const total = Number(row.internal_marks) + Number(row.external_marks);
  const percent = full ? (total / full) * 100 : 0;
  const extOk = extFull === 0 || (Number(row.external_marks) / extFull) * 100 >= passPercent;
  const passed = percent >= passPercent && extOk;
  const band = passed ? gradeFor(percent, scheme) : SCALES[scheme][0];
  const point = scheme === 'division' ? (passed ? round2((percent / 100) * 4) : 0) : band.point;
  return { total, full, percent: round2(percent), passed, grade: band.grade, point, credit: Number(row.credit) };
}

// Semester result. GPA = sum(point x credit) / sum(credit); for `division` the GPA is the 4.0-scale equivalent.
function computeSemester(subjectRows, scheme = 'tu_gpa', passPercent = 40) {
  const subs = subjectRows.map((r) => ({ ...r, ...evaluateSubject(r, scheme, passPercent) }));
  const credits = subs.reduce((a, s) => a + s.credit, 0);
  const points = subs.reduce((a, s) => a + s.point * s.credit, 0);
  const total = subs.reduce((a, s) => a + s.total, 0);
  const full = subs.reduce((a, s) => a + s.full, 0);
  const percentage = full ? (total / full) * 100 : 0;
  const status = subs.length === 0 ? 'incomplete' : subs.every((s) => s.passed) ? 'pass' : 'fail';
  const gpa = scheme === 'division' ? round2((percentage / 100) * 4) : round2(credits ? points / credits : 0);
  return {
    subjects: subs, total: round2(total), full, percentage: round2(percentage), credits, gpa,
    grade: status === 'fail' ? SCALES[scheme][0].grade : scheme === 'division' ? divisionFor(percentage) : gradeFor(percentage, scheme).grade,
    division: status === 'pass' ? divisionFor(percentage) : status === 'fail' ? 'Fail' : null,
    status,
  };
}

// CGPA: credit-weighted mean of semester GPAs.
function cgpa(semesters) {
  const credits = semesters.reduce((a, r) => a + Number(r.total_credits), 0);
  return credits ? round2(semesters.reduce((a, r) => a + Number(r.gpa) * Number(r.total_credits), 0) / credits) : 0;
}

module.exports = { SCALES, DIVISIONS, gradeFor, divisionFor, bandFor, evaluateSubject, computeSemester, cgpa, round2 };
