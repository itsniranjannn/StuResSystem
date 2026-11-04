// Analytics layer: turns raw marks / attendance into decisions (who is at risk, who will likely struggle next term, etc.).
const { query } = require('../config/db');
const A = require('./algorithms');
const { transcript } = require('./resultService');

// Attendance % per subject for one student (late counts as half).
async function attendanceFor(studentId) {
  const rows = await query(
    `SELECT s.id AS subject_id, s.code, s.name, s.semester,
            SUM(a.status='present') present, SUM(a.status='late') late, SUM(a.status='absent') absent, COUNT(*) total
       FROM attendance a JOIN subjects s ON s.id = a.subject_id WHERE a.student_id = ? GROUP BY s.id ORDER BY s.semester, s.code`, [studentId]);
  return rows.map((r) => ({ ...r, percent: A.attendancePercent(Number(r.present), Number(r.late), Number(r.total)) }));
}

const overallAttendance = (list) => {
  const t = list.reduce((a, r) => a + Number(r.total), 0);
  if (!t) return null;
  return A.attendancePercent(list.reduce((a, r) => a + Number(r.present), 0), list.reduce((a, r) => a + Number(r.late), 0), t);
};

// Everything the early-warning model needs for one student.
async function studentInsights(studentId, { includeDraft = false } = {}) {
  const [st] = await query('SELECT s.*, p.attendance_required, p.term_label, p.term_offset, p.grading_scheme FROM students s JOIN programs p ON p.id = s.program_id WHERE s.id = ?', [studentId]);
  const results = await query(
    `SELECT * FROM results WHERE student_id = ? AND status <> 'incomplete' ${includeDraft ? '' : 'AND published = 1'} ORDER BY semester, exam_year`, [studentId]);
  const series = results.map((r) => [r.semester, Number(r.gpa)]);
  const reg = A.linearRegression(series);
  const nextTerm = (results[results.length - 1]?.semester ?? 0) + 1;
  const prediction = reg ? { term: nextTerm, gpa: A.round(Math.max(0, Math.min(4, reg.predict(nextTerm)))), slope: reg.slope, r2: reg.r2, confidence: reg.r2 >= 0.6 ? 'good' : reg.r2 >= 0.3 ? 'fair' : 'low' } : null;

  const att = await attendanceFor(studentId);
  const attOverall = overallAttendance(att);
  const backlog = (await transcript(studentId, { includeDraft })).backlogs; // subjects still not cleared after any back papers
  const failed = backlog.length;
  const [internal] = await query(
    `SELECT AVG(m.internal_marks / NULLIF(s.internal_full,0) * 100) AS pct FROM marks m JOIN subjects s ON s.id = m.subject_id
      WHERE m.student_id = ? AND s.semester = ?`, [studentId, st.semester]);
  const risk = A.riskScore({
    attendance: attOverall, gpaSlope: reg?.slope ?? null, lastGpa: series.length ? series[series.length - 1][1] : null,
    failedSubjects: failed, internalPct: internal?.pct != null ? A.round(Number(internal.pct), 1) : null,
  });

  // Where does the student stand against the cohort of the latest term? (percentile via binary search, z-score)
  let standing = null;
  const last = results[results.length - 1];
  if (last) {
    const peers = await query(
      `SELECT r.gpa FROM results r JOIN students s ON s.id = r.student_id WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? AND r.status <> 'incomplete'`,
      [st.program_id, last.semester, last.exam_year]);
    const g = peers.map((p) => Number(p.gpa)).sort((a, b) => a - b);
    const d = A.describe(g);
    standing = { term: last.semester, gpa: Number(last.gpa), cohort_mean: d.mean, cohort_std: d.std, z: A.zScore(Number(last.gpa), d.mean, d.std), percentile: A.percentileRank(g, Number(last.gpa)), cohort_size: g.length };
  }
  return {
    student: { id: st.id, name: st.student_name, semester: st.semester, program_id: st.program_id }, series, prediction,
    attendance: { overall: attOverall, required: st.attendance_required, eligible: attOverall == null ? null : attOverall >= st.attendance_required, subjects: att },
    risk, standing, failed_subjects: failed,
  };
}

// Cohort analytics for a program/term/year: statistics, toppers (heap), clusters (k-means), correlation, risk list.
async function cohortInsights(programId, semester, year) {
  const rows = await query(
    `SELECT r.student_id, r.gpa, r.percentage, r.status, r.class_rank, s.student_name, s.roll_no
       FROM results r JOIN students s ON s.id = r.student_id
      WHERE s.program_id = ? AND r.semester = ? AND r.exam_year = ? AND r.status <> 'incomplete'`, [programId, semester, year]);
  if (!rows.length) return { empty: true };
  const gpas = rows.map((r) => Number(r.gpa));
  const stats = A.describe(gpas);
  const toppers = A.topK(rows, 5, (r) => Number(r.gpa) * 1000 + Number(r.percentage)).map((r) => ({ name: r.student_name, roll_no: r.roll_no, gpa: Number(r.gpa), percentage: Number(r.percentage) }));

  const ids = rows.map((r) => r.student_id);
  const att = await query(
    `SELECT a.student_id, SUM(a.status='present') p, SUM(a.status='late') l, COUNT(*) t FROM attendance a
      JOIN subjects s ON s.id = a.subject_id WHERE a.student_id IN (?) AND s.semester = ? GROUP BY a.student_id`, [ids, semester]);
  const attMap = new Map(att.map((a) => [a.student_id, A.attendancePercent(Number(a.p), Number(a.l), Number(a.t))]));
  const withAtt = rows.map((r) => ({ ...r, att: attMap.get(r.student_id) ?? null }));
  const feat = withAtt.map((r) => [Number(r.gpa), r.att ?? 85]);
  const km = A.kmeans(feat, Math.min(3, rows.length));
  const order = km.centroids.map((c, i) => [c[0], i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]); // best cluster first
  const names = ['High performers', 'Steady middle', 'Needs support'];
  const clusters = order.map((ci, rank) => {
    const members = withAtt.filter((_, i) => km.labels[i] === ci);
    return { name: names[rank] || `Group ${rank + 1}`, size: members.length, avg_gpa: A.round(members.reduce((a, m) => a + Number(m.gpa), 0) / (members.length || 1)), avg_attendance: A.round(km.centroids[ci][1], 1), students: members.slice(0, 8).map((m) => m.student_name) };
  });
  const points = withAtt.map((r, i) => ({ name: r.student_name, gpa: Number(r.gpa), attendance: r.att ?? 85, cluster: order.indexOf(km.labels[i]) }));

  const mk = await query(
    `SELECT m.internal_marks / NULLIF(s.internal_full,0) * 100 AS i, m.external_marks / NULLIF(s.external_full,0) * 100 AS e
       FROM marks m JOIN subjects s ON s.id = m.subject_id WHERE s.program_id = ? AND s.semester = ? AND m.exam_year = ? AND s.external_full > 0`, [programId, semester, year]);
  const corr = A.pearson(mk.map((x) => Number(x.i)), mk.map((x) => Number(x.e)));

  // Division spread uses the common percentage bands for every grading scheme so the chart is meaningful everywhere.
  const dist = { Distinction: 0, First: 0, Second: 0, Pass: 0, Fail: 0 };
  rows.forEach((r) => {
    const pct = Number(r.percentage);
    const k = r.status === 'fail' ? 'Fail' : pct >= 80 ? 'Distinction' : pct >= 60 ? 'First' : pct >= 48 ? 'Second' : 'Pass';
    dist[k] += 1;
  });
  // Risk list for staff: run the model for the weakest students only (bounded cost).
  const weakest = [...rows].sort((a, b) => Number(a.gpa) - Number(b.gpa)).slice(0, 12);
  const atRisk = [];
  for (const w of weakest) {
    const ins = await studentInsights(w.student_id, { includeDraft: true });
    if (ins.risk.level !== 'low') atRisk.push({ student_id: w.student_id, name: w.student_name, roll_no: w.roll_no, gpa: Number(w.gpa), attendance: ins.attendance.overall, risk: ins.risk });
  }
  atRisk.sort((a, b) => b.risk.score - a.risk.score);
  return { stats, toppers, clusters, points, kmeans_iterations: km.iterations, correlation: corr, pass_rate: A.round((rows.filter((r) => r.status === 'pass').length / rows.length) * 100, 1), at_risk: atRisk, n: rows.length, distribution: dist };
}

module.exports = { studentInsights, cohortInsights, attendanceFor, overallAttendance };
