// Live API smoke test. Run with the server up on a freshly seeded database:  node tests/smoke.mjs
const B = process.env.API || 'http://localhost:5000/api';
let fails = 0;
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const call = async (path, { method = 'GET', body, token } = {}) => {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : await r.text() };
};
const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } })).data;

ok((await call('/health')).data.database === 'connected', 'health / db connected');
ok((await call('/auth/login', { method: 'POST', body: { email: 'admin@anka.test', password: 'wrong' } })).status === 401, 'bad password rejected');
const admin = await login('admin@anka.test', 'Admin@123');
const teacher = await login('teacher1@anka.test', 'Teacher@123');
const student = await login('student@anka.test', 'Student@123');
ok(admin.token && teacher.token && student.token, 'three roles sign in');
ok((await call('/admin/dashboard', { token: student.token })).status === 403, 'student blocked from admin API');
ok((await call('/admin/dashboard')).status === 401, 'anonymous blocked');

const progs = (await call('/auth/programs')).data.programs;
ok(progs.length === 3 && progs.map((p) => p.grading_scheme).sort().join() === 'division,neb_gpa,tu_gpa', 'three programs with three grading schemes');
const dash = (await call('/admin/dashboard', { token: admin.token })).data;
ok(dash.counts.students === 96 && dash.counts.subjects === 68, `dashboard counts (${dash.counts.students} students, ${dash.counts.subjects} subjects)`);

// ---- student (BCA, semester 8) ----
const ov = (await call('/results/me/overview', { token: student.token })).data;
ok(ov.results.length === 7 && ov.cgpa > 0, `student overview: 7 published terms, CGPA ${ov.cgpa}`);
ok((await call('/results/me/marksheet/8/2026', { token: student.token })).status === 404, 'unpublished semester 8 hidden from student');
const sheet = (await call('/results/me/marksheet/7/2026', { token: student.token })).data;
ok(sheet.subjects?.length === 3 && sheet.result.class_rank >= 1 && sheet.result.verify_code?.length === 10, 'marksheet semester 7 with verify code');
const v = (await call(`/results/public/verify/${sheet.result.verify_code}`)).data;
ok(v.valid && v.result.student_name === 'Niranjan Katwal', 'public verification accepts genuine code');
ok(!(await call('/results/public/verify/AAAAAAAAAA')).data.valid, 'public verification rejects fake code');
const tr = (await call('/results/me/transcript', { token: student.token })).data;
ok(tr.terms.length === 7 && tr.cgpa === ov.cgpa, 'transcript matches CGPA');
const ins = (await call('/results/me/insights', { token: student.token })).data;
ok(ins.prediction && ins.risk && ins.standing?.percentile >= 0, `insights: predicted GPA ${ins.prediction?.gpa}, risk ${ins.risk?.level}, percentile ${ins.standing?.percentile}`);
const att = (await call('/results/me/attendance', { token: student.token })).data;
ok(att.subjects.length >= 2 && att.overall > 0, `attendance overall ${att.overall}%`);

// ---- teacher: marks, CSV import, attendance ----
const subs = (await call('/teacher/subjects', { token: teacher.token })).data.subjects;
const cur = subs.find((s) => s.semester === 6) || subs[subs.length - 1];
const roster = (await call(`/teacher/subjects/${cur.id}/marks`, { token: teacher.token })).data;
ok(subs.length > 0 && roster.roster.length > 0, `teacher roster for ${cur.code} (${roster.roster.length} students)`);
const entry = roster.roster[0];
ok((await call(`/teacher/subjects/${cur.id}/marks`, { method: 'PUT', token: teacher.token, body: { year: roster.year, entries: [{ student_id: entry.student_id, internal_marks: cur.internal_full, external_marks: cur.external_marks ?? cur.external_full }] } })).data.success, 'teacher saves marks');
ok((await call(`/teacher/subjects/${cur.id}/marks`, { method: 'PUT', token: teacher.token, body: { year: roster.year, entries: [{ student_id: entry.student_id, internal_marks: 999, external_marks: 0 }] } })).status === 400, 'out-of-range marks rejected');
const csv = `symbol,internal,external\n${roster.roster[1].roll_no},30,45\nNOPE123,10,10`;
const imp = (await call(`/teacher/subjects/${cur.id}/marks/import`, { method: 'POST', token: teacher.token, body: { year: roster.year, csv } })).data;
ok(imp.saved === 1 && imp.skipped.length === 1, 'CSV import saves valid rows and reports unknown symbols');
const impBad = await call(`/teacher/subjects/${cur.id}/marks/import`, { method: 'POST', token: teacher.token, body: { year: roster.year, csv: `${roster.roster[2].roll_no},9999,1` } });
ok(impBad.status === 400 && /internal/.test(impBad.data.message), 'CSV import refuses out-of-range marks');
const other = (await call('/admin/subjects', { token: admin.token })).data.subjects.find((s) => s.teacher_id !== subs[0].teacher_id);
ok((await call(`/teacher/subjects/${other.id}/marks`, { token: teacher.token })).status === 403, "teacher can't open another teacher's subject");
const today = new Date().toISOString().slice(0, 10);
const attSheet = (await call(`/teacher/subjects/${cur.id}/attendance?date=${today}`, { token: teacher.token })).data;
const sv = await call(`/teacher/subjects/${cur.id}/attendance`, { method: 'PUT', token: teacher.token, body: { date: today, entries: attSheet.roster.slice(0, 3).map((r) => ({ student_id: r.student_id, status: 'present' })) } });
ok(sv.data.saved === 3, 'teacher marks attendance');
ok((await call(`/teacher/subjects/${cur.id}/attendance`, { method: 'PUT', token: teacher.token, body: { date: '2099-01-01', entries: [{ student_id: 1, status: 'present' }] } })).status === 400, 'future attendance refused');
const an = (await call(`/teacher/subjects/${subs[0].id}/analytics?year=${(await call(`/teacher/subjects/${subs[0].id}/marks`, { token: teacher.token })).data.year}`, { token: teacher.token })).data;
ok(an.count > 0 && an.stats && an.top.length > 0, 'subject analytics with statistics and top-k');

// ---- insights ----
const batches = (await call('/admin/results/batches', { token: admin.token })).data.batches;
const bca6 = batches.find((b) => b.program === 'BCA' && b.semester === 6);
const ci = (await call(`/admin/insights?program_id=${bca6.program_id}&semester=6&exam_year=${bca6.exam_year}`, { token: admin.token })).data;
ok(ci.stats.n > 5 && ci.clusters.length === 3 && ci.toppers.length === 5 && ci.at_risk, `cohort insights: ${ci.clusters.length} clusters, ${ci.at_risk.length} at-risk, correlation ${ci.correlation}`);

// ---- admin: publish / promote / program types ----
const pub = await call('/admin/results/publish', { method: 'POST', token: admin.token, body: { program_id: bca6.program_id, semester: 6, exam_year: bca6.exam_year, publish: true, notify: false } });
ok(pub.data.success && pub.data.affected > 0, 'admin publishes BCA semester 6');
ok((await call(`/results/me/marksheet/6/${bca6.exam_year}`, { token: student.token })).status === 404, "other cohort's result stays hidden from this student");
await call('/admin/results/publish', { method: 'POST', token: admin.token, body: { program_id: bca6.program_id, semester: 6, exam_year: bca6.exam_year, publish: false } });
const bca8 = batches.find((b) => b.program === 'BCA' && b.semester === 8);
ok((await call('/admin/results/promote', { method: 'POST', token: admin.token, body: { program_id: bca8.program_id, semester: 8, exam_year: bca8.exam_year } })).status === 400, 'cannot promote beyond final term');
const sci = (await call('/admin/students?program_id=' + progs.find((p) => p.code === 'SCI').id, { token: admin.token })).data.students[0];
const pubSearch = (await call(`/results/public/search?roll_no=${encodeURIComponent(sci.roll_no)}`)).data;
ok(pubSearch.results.length >= 1 && ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'NG'].includes(pubSearch.results[0].grade), `NEB grading in public search (${pubSearch.results[0]?.grade})`);
const bbs = (await call('/admin/students?program_id=' + progs.find((p) => p.code === 'BBS').id, { token: admin.token })).data.students.find((s) => s.semester === 3);
const bbsRes = (await call(`/results/public/search?roll_no=${encodeURIComponent(bbs.roll_no)}`)).data;
ok(bbsRes.results.every((r) => r.division), `BBS division in results (${bbsRes.results.map((r) => r.division).join(', ')})`);
const np = await call('/admin/programs', { method: 'POST', token: admin.token, body: { code: 'TST', name: 'Test Class 10', level: 'school', grading_scheme: 'division', term_label: 'Class', term_count: 1, term_offset: 9, terms_per_year: 1, pass_percent: 40 } });
ok(np.status === 201, 'admin creates a new program (any institution level)');
const npId = (await call('/admin/programs', { token: admin.token })).data.programs.find((p) => p.code === 'TST').id;
ok((await call(`/admin/programs/${npId}`, { method: 'DELETE', token: admin.token })).data.success, 'admin deletes empty program');

// ---- ranking, csv, mail, settings ----
const rk = (await call(`/results/ranking?program_id=${ov.student.program_id}&semester=7&exam_year=2026`, { token: student.token })).data;
ok(rk.ranking.length > 1 && rk.ranking[0].class_rank === 1, 'ranking list');
const sciId = progs.find((p) => p.code === 'SCI').id;
ok((await call(`/results/ranking?program_id=${sciId}&semester=1&exam_year=2025`, { token: student.token })).status === 403, "student can't see another program's ranking");
const csvOut = await call(`/admin/results/export.csv?program_id=${ov.student.program_id}&semester=7&exam_year=2026`, { token: admin.token });
ok(typeof csvOut.data === 'string' && csvOut.data.startsWith('Symbol No'), 'CSV export');
const mail = (await call('/admin/mail', { token: admin.token })).data;
ok(mail.configured === false || mail.configured === true, `mail center reachable (configured: ${mail.configured})`);
const prevName = (await call('/admin/settings', { token: admin.token })).data.settings.institution_name;
const set = (await call('/admin/settings', { method: 'PUT', token: admin.token, body: { institution_name: 'Test Campus' } })).data;
ok(set.settings.institution_name === 'Test Campus', 'institution settings saved');
await call('/admin/settings', { method: 'PUT', token: admin.token, body: { institution_name: prevName } });

// ---- registration + reset ----
const em = `t${Date.now()}@test.np`;
const reg = await call('/auth/register', { method: 'POST', body: { name: 'Test Person', email: em, password: 'Passw0rdX', roll_no: 'T' + Date.now(), semester: 3, program_id: progs[0].id } });
ok(reg.status === 201 && reg.data.token, 'student self-registration');
const fp = (await call('/auth/forgot-password', { method: 'POST', body: { email: em } })).data;
const tok = fp.dev_reset_link?.split('/').pop();
ok(tok || mail.configured, 'forgot password issues link');
if (tok) {
  ok((await call('/auth/reset-password', { method: 'POST', body: { token: tok, password: 'NewPassw0rd' } })).data.success, 'reset password');
  ok((await login(em, 'NewPassw0rd')).token, 'login with new password');
}
ok((await call('/auth/register', { method: 'POST', body: { name: 'Pending Teacher', email: `p${Date.now()}@test.np`, password: 'Passw0rdX', role: 'teacher' } })).data.pending, 'teacher registration pending approval');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
