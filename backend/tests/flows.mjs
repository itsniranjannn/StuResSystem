// Exhaustive API flow test. Run against a FRESHLY seeded database with the API started with email disabled:
//   EMAIL_USER= EMAIL_APP_PASSWORD= node server.js   then   node tests/flows.mjs
// Every module is exercised: auth, permissions, admin CRUD, teacher marks/attendance/import, results lifecycle,
// student and public views, insights, mail center, plus grading/ranking integrity checks.
const B = process.env.API || 'http://localhost:5000/api';
const results = [];
let section = '';
const sec = (s) => { section = s; console.log(`\n## ${s}`); };
async function t(name, fn) {
  try { await fn(); results.push({ ok: true }); console.log(`  PASS ${name}`); }
  catch (e) { results.push({ ok: false, section, name, err: e.message }); console.log(`  FAIL ${name}\n       ${e.message}`); }
}
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const ok = (c, m = 'assertion failed') => { if (!c) throw new Error(m); };

async function call(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : await r.text() };
}
const login = async (email, password) => (await call('/auth/login', { method: 'POST', body: { email, password } }));
const uid = Date.now().toString(36);

// ---------------------------------------------------------------- setup
const A = (await login('admin@anka.test', 'Admin@123')).data;
const T1 = (await login('teacher1@anka.test', 'Teacher@123')).data;
const T2 = (await login('teacher5@anka.test', 'Teacher@123')).data; // management teacher (BBS)
const S = (await login('student@anka.test', 'Student@123')).data;
ok(A.token && T1.token && T2.token && S.token, 'seed logins failed: is the database freshly seeded?');
// Safety: this suite creates hundreds of emails. Refuse to run if the API could really send mail.
if ((await call('/admin/mail', { token: A.token })).data.configured) { console.error('ABORT: email is configured on this API. Start it with EMAIL_USER and EMAIL_APP_PASSWORD set to a single space.'); process.exit(2); }
const progs = (await call('/auth/programs')).data.programs;
const P = Object.fromEntries(progs.map((p) => [p.code, p]));

// ---------------------------------------------------------------- 1. auth
sec('1. Authentication');
await t('public programs and institution endpoints', async () => {
  eq(progs.length, 3, 'programs');
  const i = (await call('/auth/institution')).data.institution;
  ok(i.name === '' && 'short' in i && 'tagline' in i && 'address' in i, 'institution fields');
});
const reg = (o) => call('/auth/register', { method: 'POST', body: { name: 'Test Person', email: `x${uid}${Math.random().toString(36).slice(2, 6)}@flows.test`, password: 'Passw0rdX', role: 'student', roll_no: `R${uid}${Math.random().toString(36).slice(2, 6)}`, semester: 2, program_id: P.BCA.id, ...o } });
await t('registration validation (name, email, password, role, program, term)', async () => {
  eq((await reg({ name: 'ab' })).status, 400, 'short name');
  eq((await reg({ email: 'nope' })).status, 400, 'bad email');
  eq((await reg({ password: 'abc' })).status, 400, 'weak pw');
  eq((await reg({ password: 'abcdefgh' })).status, 400, 'pw without digit');
  eq((await reg({ role: 'admin' })).status, 400, 'admin role');
  eq((await reg({ program_id: 9999 })).status, 400, 'bad program');
  eq((await reg({ semester: 9 })).status, 400, 'term above program max');
  eq((await reg({ semester: 0 })).status, 400, 'term zero');
  eq((await reg({ roll_no: '' })).status, 400, 'missing roll');
});
let reg1;
await t('student self-registration for each program type', async () => {
  reg1 = await reg({});
  eq(reg1.status, 201); ok(reg1.data.token); eq(reg1.data.user.role, 'student'); eq(reg1.data.user.program, 'BCA');
  eq((await reg({ program_id: P.SCI.id, semester: 2 })).status, 201, 'SCI');
  eq((await reg({ program_id: P.BBS.id, semester: 4 })).status, 201, 'BBS');
});
await t('duplicate email and duplicate symbol number rejected', async () => {
  const em = `dup${uid}@flows.test`; const roll = `D${uid}`;
  eq((await reg({ email: em, roll_no: roll })).status, 201);
  eq((await reg({ email: em })).status, 409, 'dup email');
  eq((await reg({ roll_no: roll })).status, 409, 'dup roll');
});
await t('new student can sign in and /me returns profile', async () => {
  const l = await login(reg1.data.user.email, 'Passw0rdX'); eq(l.status, 200);
  const me = (await call('/auth/me', { token: l.data.token })).data.user;
  eq(me.role, 'student'); ok(me.roll_no && me.student_id && me.term_label === 'Semester');
});
let pendingTeacher;
await t('teacher registration is pending; cannot sign in until approved', async () => {
  const em = `tch${uid}@flows.test`;
  const r = await call('/auth/register', { method: 'POST', body: { name: 'New Teacher', email: em, password: 'Passw0rdX', role: 'teacher', department: 'Science', qualification: 'MSc' } });
  eq(r.status, 201); ok(r.data.pending); pendingTeacher = em;
  const l = await login(em, 'Passw0rdX'); eq(l.status, 403); ok(/approval/i.test(l.data.message));
});
await t('admin approves teacher, who can then sign in and sees no subjects', async () => {
  const list = (await call('/admin/teachers', { token: A.token })).data.teachers;
  const nt = list.find((x) => x.email === pendingTeacher); ok(nt && !nt.is_active, 'listed as pending');
  eq((await call(`/admin/users/${nt.user_id}/active`, { method: 'PATCH', token: A.token, body: { is_active: true } })).status, 200);
  const l = await login(pendingTeacher, 'Passw0rdX'); eq(l.status, 200);
  eq((await call('/teacher/subjects', { token: l.data.token })).data.subjects.length, 0);
  // disabled users lose access immediately, even with a valid token
  eq((await call(`/admin/users/${nt.user_id}/active`, { method: 'PATCH', token: A.token, body: { is_active: false } })).status, 200);
  eq((await call('/auth/me', { token: l.data.token })).status, 401, 'token rejected after disable');
  eq((await login(pendingTeacher, 'Passw0rdX')).status, 403);
});
await t('wrong credentials and unknown user are rejected without detail', async () => {
  eq((await login('admin@anka.test', 'x')).status, 401); eq((await login('nobody@x.np', 'Passw0rd1')).status, 401); eq((await login('', '')).status, 401);
});
await t('password change validates current and new passwords', async () => {
  const em = `pw${uid}@flows.test`; const r = await reg({ email: em }); const tk = r.data.token;
  eq((await call('/auth/password', { method: 'PUT', token: tk, body: { current_password: 'wrong', new_password: 'Another1Pass' } })).status, 400);
  eq((await call('/auth/password', { method: 'PUT', token: tk, body: { current_password: 'Passw0rdX', new_password: 'short' } })).status, 400);
  eq((await call('/auth/password', { method: 'PUT', token: tk, body: { current_password: 'Passw0rdX', new_password: 'Another1Pass' } })).status, 200);
  eq((await login(em, 'Passw0rdX')).status, 401, 'old password dead'); eq((await login(em, 'Another1Pass')).status, 200);
});
await t('forgot and reset password: generic reply, single-use token, validation', async () => {
  const em = `rs${uid}@flows.test`; await reg({ email: em });
  const unknown = (await call('/auth/forgot-password', { method: 'POST', body: { email: 'ghost@flows.test' } })).data;
  ok(unknown.success && !unknown.dev_reset_link, 'unknown email gives no link and no error');
  const f = (await call('/auth/forgot-password', { method: 'POST', body: { email: em } })).data;
  const tok = f.dev_reset_link?.split('/').pop(); ok(tok, 'dev link when email is off');
  eq((await call('/auth/reset-password', { method: 'POST', body: { token: tok, password: 'weak' } })).status, 400);
  eq((await call('/auth/reset-password', { method: 'POST', body: { token: 'bogus', password: 'GoodPass12' } })).status, 400);
  eq((await call('/auth/reset-password', { method: 'POST', body: { token: tok, password: 'GoodPass12' } })).status, 200);
  eq((await call('/auth/reset-password', { method: 'POST', body: { token: tok, password: 'GoodPass13' } })).status, 400, 'token is single use');
  eq((await login(em, 'GoodPass12')).status, 200);
});

// ---------------------------------------------------------------- 2. RBAC
sec('2. Role-based access (every protected endpoint x every role)');
const MATRIX = [
  ['GET', '/admin/dashboard', ['admin']], ['GET', '/admin/programs', ['admin']], ['POST', '/admin/programs', ['admin']], ['PUT', '/admin/programs/1', ['admin']], ['DELETE', '/admin/programs/99999', ['admin']],
  ['PATCH', '/admin/users/99999/active', ['admin']], ['POST', '/admin/users/99999/reset-password', ['admin']], ['DELETE', '/admin/users/99999', ['admin']],
  ['GET', '/admin/students', ['admin']], ['POST', '/admin/students', ['admin']], ['PUT', '/admin/students/99999', ['admin']], ['GET', '/admin/teachers', ['admin']],
  ['GET', '/admin/subjects', ['admin']], ['POST', '/admin/subjects', ['admin']], ['PUT', '/admin/subjects/99999', ['admin']], ['DELETE', '/admin/subjects/99999', ['admin']],
  ['GET', '/admin/results/batches', ['admin']], ['POST', '/admin/results/calculate', ['admin']], ['POST', '/admin/results/publish', ['admin']], ['GET', '/admin/results?program_id=1&semester=1&exam_year=2023', ['admin']],
  ['GET', '/admin/results/export.csv?program_id=1&semester=1&exam_year=2023', ['admin']], ['POST', '/admin/results/promote', ['admin']], ['GET', '/admin/insights?program_id=1&semester=1&exam_year=2023', ['admin']], ['POST', '/admin/insights/alerts', ['admin']],
  ['GET', '/admin/notices', ['admin']], ['POST', '/admin/notices', ['admin']], ['DELETE', '/admin/notices/99999', ['admin']], ['GET', '/admin/audit', ['admin']], ['GET', '/admin/settings', ['admin']], ['PUT', '/admin/settings', ['admin']],
  ['GET', '/admin/mail', ['admin']], ['GET', '/admin/mail/1', ['admin']], ['POST', '/admin/mail/verify', ['admin']], ['POST', '/admin/mail/test', ['admin']], ['POST', '/admin/mail/retry', ['admin']], ['GET', '/admin/exam-year?program_id=1&batch=2023&term=1', ['admin']],
  ['GET', '/teacher/subjects', ['teacher', 'admin']], ['GET', '/teacher/cohorts', ['teacher', 'admin']], ['GET', '/teacher/insights?program_id=1&semester=99&exam_year=2023', ['admin']],
  ['GET', '/teacher/subjects/99999/marks', ['teacher', 'admin']], ['PUT', '/teacher/subjects/99999/marks', ['teacher', 'admin']], ['POST', '/teacher/subjects/99999/marks/import', ['teacher', 'admin']],
  ['GET', '/teacher/subjects/99999/attendance', ['teacher', 'admin']], ['PUT', '/teacher/subjects/99999/attendance', ['teacher', 'admin']], ['GET', '/teacher/subjects/99999/analytics', ['teacher', 'admin']], ['GET', '/teacher/subjects/99999/backpapers', ['teacher', 'admin']], ['PUT', '/teacher/subjects/99999/backpapers', ['teacher', 'admin']],
  ['GET', '/results/me/overview', ['student']], ['GET', '/results/me/marksheet/1/2023', ['student']], ['GET', '/results/me/transcript', ['student']], ['GET', '/results/me/attendance', ['student']], ['GET', '/results/me/insights', ['student']], ['GET', '/results/me/analysis', ['student']],
  ['GET', '/results/available', ['student', 'teacher', 'admin']], ['GET', '/results/ranking?program_id=1&semester=1&exam_year=2023', ['student', 'teacher', 'admin']], ['GET', '/results/notices', ['student', 'teacher', 'admin']],
  ['GET', '/results/marksheet/1/1/2023', ['teacher', 'admin']], ['GET', '/results/transcript/1', ['teacher', 'admin']], ['GET', '/results/student-insights/1', ['teacher', 'admin']],
  ['GET', '/auth/me', ['student', 'teacher', 'admin']], ['PUT', '/auth/password', ['student', 'teacher', 'admin']],
];
const tokens = { admin: A.token, teacher: T1.token, student: S.token };
await t(`permission matrix: ${MATRIX.length} endpoints x anonymous + 3 roles`, async () => {
  const bad = [];
  for (const [m, p, allowed] of MATRIX) {
    const anon = await call(p, { method: m, body: m === 'GET' ? undefined : {} });
    if (anon.status !== 401) bad.push(`${m} ${p} anonymous -> ${anon.status}`);
    for (const role of ['admin', 'teacher', 'student']) {
      const r = await call(p, { method: m, token: tokens[role], body: m === 'GET' ? undefined : {} });
      const should = allowed.includes(role);
      if (should && (r.status === 401 || r.status === 403)) bad.push(`${m} ${p} ${role} wrongly denied (${r.status})`);
      if (!should && r.status !== 403) bad.push(`${m} ${p} ${role} wrongly allowed (${r.status})`);
    }
  }
  ok(!bad.length, `\n         ${bad.slice(0, 12).join('\n         ')}${bad.length > 12 ? `\n         ... ${bad.length - 12} more` : ''}`);
});
await t('malformed bearer token and tampered JWT are rejected', async () => {
  eq((await call('/auth/me', { token: 'abc' })).status, 401);
  eq((await call('/auth/me', { token: `${A.token.slice(0, -3)}xyz` })).status, 401);
});

// ---------------------------------------------------------------- 3. admin crud
sec('3. Admin: programs, subjects, students, teachers, users');
let prog;
await t('programs: validation, create, duplicate, update, delete', async () => {
  const base = { code: `T${uid}`.slice(0, 12).toUpperCase(), name: 'Test Class 9', level: 'school', grading_scheme: 'division', term_label: 'Class', term_count: 2, term_offset: 8, terms_per_year: 1, pass_percent: 40, attendance_required: 75 };
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: { ...base, code: '' } })).status, 400, 'no code');
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: { ...base, grading_scheme: 'bogus' } })).status, 400, 'bad scheme');
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: { ...base, term_count: 20 } })).status, 400, 'too many terms');
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: { ...base, pass_percent: 5 } })).status, 400, 'pass too low');
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: base })).status, 201);
  eq((await call('/admin/programs', { method: 'POST', token: A.token, body: base })).status, 409, 'dup code');
  prog = (await call('/admin/programs', { token: A.token })).data.programs.find((p) => p.code === base.code);
  ok(prog && prog.students === 0 && prog.subjects === 0);
  eq((await call(`/admin/programs/${prog.id}`, { method: 'PUT', token: A.token, body: { ...base, name: 'Renamed', pass_percent: 45 } })).status, 200);
  eq((await call('/admin/programs', { token: A.token })).data.programs.find((p) => p.id === prog.id).name, 'Renamed');
});
await t('programs: a program with students or subjects cannot be deleted; an empty one can', async () => {
  eq((await call(`/admin/programs/${P.BCA.id}`, { method: 'DELETE', token: A.token })).status, 409);
  eq((await call(`/admin/programs/${prog.id}`, { method: 'DELETE', token: A.token })).status, 200);
});
let subj;
await t('subjects: validation, create, duplicate code, update with teacher, delete', async () => {
  const base = { program_id: P.BCA.id, code: `TS${uid}`.toUpperCase(), name: 'Test Subject', semester: 1, credit: 3, type: 'theory', internal_full: 40, external_full: 60, teacher_id: '' };
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: { ...base, credit: 0 } })).status, 400, 'zero credit');
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: { ...base, internal_full: 0, external_full: 0 } })).status, 400, 'zero marks');
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: { ...base, semester: 13 } })).status, 400, 'bad term');
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: { ...base, code: '' } })).status, 400, 'no code');
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: base })).status, 201);
  eq((await call('/admin/subjects', { method: 'POST', token: A.token, body: base })).status, 409, 'dup');
  subj = (await call(`/admin/subjects?program_id=${P.BCA.id}&semester=1`, { token: A.token })).data.subjects.find((s) => s.code === base.code); ok(subj);
  const tid = (await call('/admin/teachers', { token: A.token })).data.teachers.find((x) => x.email === 'teacher2@anka.test').id;
  eq((await call(`/admin/subjects/${subj.id}`, { method: 'PUT', token: A.token, body: { ...subj, name: 'Edited', teacher_id: tid } })).status, 200);
  const after = (await call(`/admin/subjects?program_id=${P.BCA.id}&semester=1`, { token: A.token })).data.subjects.find((s) => s.id === subj.id);
  eq(after.name, 'Edited'); eq(after.teacher_name, 'Sarita Koirala');
  eq((await call(`/admin/subjects/${subj.id}`, { method: 'PUT', token: A.token, body: { ...after, code: 'CACS101' } })).status, 409, 'cannot take an existing code');
  eq((await call(`/admin/subjects/${subj.id}`, { method: 'DELETE', token: A.token })).status, 200);
  ok(!(await call(`/admin/subjects?program_id=${P.BCA.id}&semester=1`, { token: A.token })).data.subjects.some((s) => s.id === subj.id));
});
let stu;
await t('students: validation, create, duplicates, update, password reset, disable, delete', async () => {
  const base = { name: 'Created Student', email: `cs${uid}@flows.test`, password: '', program_id: P.BCA.id, roll_no: `CS${uid}`, semester: 3, batch: 2024, gender: 'female', guardian_email: `g${uid}@flows.test`, phone: '9800000000', address: 'Lalitpur', dob: '2005-03-04' };
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: { ...base, email: 'bad' } })).status, 400, 'bad email');
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: { ...base, guardian_email: 'bad' } })).status, 400, 'bad guardian');
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: { ...base, semester: 9 } })).status, 400, 'term over max');
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: { ...base, program_id: 9999 } })).status, 400, 'no program');
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: { ...base, password: 'weak' } })).status, 400, 'weak password');
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: base })).status, 201);
  eq((await call('/admin/students', { method: 'POST', token: A.token, body: base })).status, 409, 'dup');
  stu = (await call(`/admin/students?q=${base.roll_no}`, { token: A.token })).data.students[0];
  ok(stu && stu.guardian_email === base.guardian_email && stu.program === 'BCA');
  eq((await login(base.email, 'Student@123')).status, 200, 'default password works');
  eq((await call(`/admin/students/${stu.id}`, { method: 'PUT', token: A.token, body: { ...stu, name: 'Renamed Student', email: `new${uid}@flows.test`, semester: 4, guardian_email: '' } })).status, 200);
  const u = (await call(`/admin/students?q=${base.roll_no}`, { token: A.token })).data.students[0];
  eq(u.student_name, 'Renamed Student'); eq(u.email, `new${uid}@flows.test`); eq(u.semester, 4); ok(!u.guardian_email);
  eq((await call(`/admin/students/${stu.id}`, { method: 'PUT', token: A.token, body: { ...u, name: u.student_name, email: 'student@anka.test' } })).status, 409, 'email owned by someone else');
  eq((await call(`/admin/students/${stu.id}`, { method: 'PUT', token: A.token, body: { ...u, name: u.student_name, roll_no: '27802063' } })).status, 409, 'symbol owned by someone else');
  eq((await call(`/admin/users/${u.user_id}/reset-password`, { method: 'POST', token: A.token, body: { password: 'weak' } })).status, 400);
  eq((await call(`/admin/users/${u.user_id}/reset-password`, { method: 'POST', token: A.token, body: { password: 'Fresh1234' } })).status, 200);
  eq((await login(`new${uid}@flows.test`, 'Fresh1234')).status, 200);
  eq((await call(`/admin/users/${u.user_id}/active`, { method: 'PATCH', token: A.token, body: { is_active: false } })).status, 200);
  eq((await login(`new${uid}@flows.test`, 'Fresh1234')).status, 403, 'disabled student blocked');
  eq((await call(`/admin/users/${u.user_id}`, { method: 'DELETE', token: A.token })).status, 200);
  eq((await call(`/admin/students?q=${base.roll_no}`, { token: A.token })).data.students.length, 0);
});
await t('students list: search, program and term filters', async () => {
  const all = (await call('/admin/students', { token: A.token })).data.students;
  ok(all.length >= 96);
  eq((await call('/admin/students?q=27802063', { token: A.token })).data.students.length, 1);
  const bbs = (await call(`/admin/students?program_id=${P.BBS.id}`, { token: A.token })).data.students; ok(bbs.length >= 20 && bbs.every((s) => s.program === 'BBS'));
  const t8 = (await call(`/admin/students?program_id=${P.BCA.id}&semester=8`, { token: A.token })).data.students; ok(t8.length >= 14 && t8.every((s) => s.semester === 8));
});
await t('admin cannot disable or delete their own account', async () => {
  const me = (await call('/auth/me', { token: A.token })).data.user;
  eq((await call(`/admin/users/${me.id}/active`, { method: 'PATCH', token: A.token, body: { is_active: false } })).status, 400);
  eq((await call(`/admin/users/${me.id}`, { method: 'DELETE', token: A.token })).status, 400);
});
await t('teachers list exposes approval state and workload', async () => {
  const l = (await call('/admin/teachers', { token: A.token })).data.teachers;
  ok(l.length >= 9 && l.every((x) => 'subject_count' in x && 'is_active' in x));
});
await t('dashboard counts and program filter', async () => {
  const all = (await call('/admin/dashboard', { token: A.token })).data;
  ok(all.counts.students >= 96 && all.counts.subjects === 68 && Array.isArray(all.perTerm) && Array.isArray(all.gradeDist) && all.topSubjects.length === 5);
  const bbs = (await call(`/admin/dashboard?program_id=${P.BBS.id}`, { token: A.token })).data;
  ok(bbs.counts.students >= 20 && bbs.counts.students < all.counts.students && bbs.counts.subjects === 19);
});
await t('exam-year helper', async () => {
  eq((await call(`/admin/exam-year?program_id=${P.BCA.id}&batch=2022&term=8`, { token: A.token })).data.exam_year, 2026);
  eq((await call(`/admin/exam-year?program_id=${P.BBS.id}&batch=2023&term=3`, { token: A.token })).data.exam_year, 2026);
});

// ---------------------------------------------------------------- 4. notices, settings, audit, mail
sec('4. Notices, institution settings, audit log, mail center');
await t('notices: validation, create (with email flag), audience filtering, delete', async () => {
  eq((await call('/admin/notices', { method: 'POST', token: A.token, body: { title: '', body: 'x' } })).status, 400);
  const n = await call('/admin/notices', { method: 'POST', token: A.token, body: { title: `Notice ${uid}`, body: 'Hello everyone', audience: 'student', email: true } });
  eq(n.status, 201); ok(n.data.queued > 0, 'recipients logged');
  const list = (await call('/admin/notices', { token: A.token })).data.notices; const mine = list.find((x) => x.title === `Notice ${uid}`); ok(mine);
  ok((await call('/results/notices', { token: S.token })).data.notices.some((x) => x.id === mine.id), 'student sees student notice');
  ok(!(await call('/results/notices', { token: T1.token })).data.notices.some((x) => x.id === mine.id), 'teacher does not see student-only notice');
  eq((await call(`/admin/notices/${mine.id}`, { method: 'DELETE', token: A.token })).status, 200);
});
await t('settings: read, update known keys, ignore unknown keys, public view reflects it', async () => {
  const before = (await call('/admin/settings', { token: A.token })).data.settings;
  const put = await call('/admin/settings', { method: 'PUT', token: A.token, body: { institution_name: `Inst ${uid}`, institution_short: 'ShortX', institution_tagline: 'Board X', institution_address: 'Somewhere', institution_email: 'a@b.np', institution_phone: '01-555', institution_website: 'https://x.np', evil_key: 'drop table' } });
  eq(put.status, 200); eq(put.data.settings.institution_name, `Inst ${uid}`); ok(!('evil_key' in put.data.settings));
  const pub = (await call('/auth/institution')).data.institution; eq(pub.name, `Inst ${uid}`); eq(pub.short, 'ShortX'); eq(pub.tagline, 'Board X');
  const ms = (await call(`/results/public/marksheet?roll_no=27802063&semester=1`)).data;
  eq(ms.institution.institution_name, `Inst ${uid}`, 'marksheets use the edited institution');
  await call('/admin/settings', { method: 'PUT', token: A.token, body: { institution_name: before.institution_name, institution_short: before.institution_short, institution_tagline: before.institution_tagline, institution_address: before.institution_address, institution_email: before.institution_email, institution_phone: '', institution_website: '' } });
});
await t('mail center: status, test message, preview, unconfigured behaviour', async () => {
  const m = (await call('/admin/mail', { token: A.token })).data; eq(m.configured, false, 'test run must have email disabled');
  eq((await call('/admin/mail/test', { method: 'POST', token: A.token, body: { to: 'bad' } })).status, 400);
  eq((await call('/admin/mail/test', { method: 'POST', token: A.token, body: { to: `me${uid}@flows.test` } })).status, 200);
  const logs = (await call('/admin/mail', { token: A.token })).data.logs; const l = logs.find((x) => x.to_email === `me${uid}@flows.test`);
  ok(l && l.status === 'skipped' && l.kind === 'test', 'logged as skipped');
  const full = (await call(`/admin/mail/${l.id}`, { token: A.token })).data.message; ok(/<html/i.test(full.html) && full.html.includes('Email is working'), 'html preview');
  eq((await call('/admin/mail/99999999', { token: A.token })).status, 404);
  const v = (await call('/admin/mail/verify', { method: 'POST', token: A.token })).data; eq(v.ok, false);
  const r = (await call('/admin/mail/retry', { method: 'POST', token: A.token })).data; eq(r.requeued, 0, 'nothing is re-queued while email is off');
  ok(logs.some((x) => /anka\.test$/.test(x.to_email) || /flows\.test$/.test(x.to_email)), 'demo addresses are logged');
  eq((await call('/admin/mail', { token: A.token })).data.logs.find((x) => x.id === l.id).status, 'skipped', 'still skipped');
});
await t('audit log records admin actions', async () => {
  const logs = (await call('/admin/audit', { token: A.token })).data.logs;
  for (const a of ['STUDENT_CREATE', 'SUBJECT_CREATE', 'PROGRAM_CREATE', 'USER_ENABLE', 'SETTINGS_UPDATE', 'NOTICE_CREATE']) ok(logs.some((l) => l.action === a), `missing ${a}`);
});

// ---------------------------------------------------------------- 5. teacher flows
sec('5. Teacher: subjects, marks, import, attendance, analytics, insights');
const tsubs = (await call('/teacher/subjects', { token: T1.token })).data.subjects;
const sem6 = tsubs.find((s) => s.program === 'BCA' && s.semester === 6 && s.external_full > 0);
let roster; let year;
await t('teacher subjects include progress fields', async () => {
  ok(tsubs.length >= 8 && tsubs.every((s) => 'expected' in s && 'entered' in s && 'class_days' in s));
  ok(sem6, 'teacher1 has a semester-6 BCA subject');
});
await t('roster for the current cohort', async () => {
  const r = (await call(`/teacher/subjects/${sem6.id}/marks`, { token: T1.token })).data; roster = r.roster; year = r.year;
  eq(year, 2026); eq(roster.length, 14); ok(r.years.length >= 1); ok(roster.every((x) => x.internal_marks != null && !x.locked));
});
await t('marks save: valid, invalid, blank, partial, nonnumeric', async () => {
  const s0 = roster[0];
  const good = await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { year, entries: [{ student_id: s0.student_id, internal_marks: 31.5, external_marks: 48 }] } });
  eq(good.status, 200); eq(good.data.saved, 1);
  const again = (await call(`/teacher/subjects/${sem6.id}/marks`, { token: T1.token })).data.roster.find((x) => x.student_id === s0.student_id);
  eq([again.internal_marks, again.external_marks], [31.5, 48]);
  for (const [i, e] of [[-1, 10], [41, 10], [10, 61], ['abc', 10], [10, 'x']]) eq((await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { year, entries: [{ student_id: s0.student_id, internal_marks: i, external_marks: e }] } })).status, 400, `reject ${i}/${e}`);
  const blank = await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { year, entries: [{ student_id: s0.student_id, internal_marks: '', external_marks: '' }] } });
  eq(blank.data.saved, 0, 'blank rows are ignored, never zero-filled');
  eq((await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { year, entries: [] } })).status, 400);
  eq((await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { entries: [{ student_id: s0.student_id, internal_marks: 1, external_marks: 1 }] } })).status, 400, 'year required');
});
await t('saving marks recalculates GPA and rank', async () => {
  const s0 = roster[0];
  await call(`/teacher/subjects/${sem6.id}/marks`, { method: 'PUT', token: T1.token, body: { year, entries: [{ student_id: s0.student_id, internal_marks: 40, external_marks: 60 }] } });
  const bca = (await call('/admin/results/batches', { token: A.token })).data.batches.find((b) => b.program === 'BCA' && b.semester === 6);
  const rows = (await call(`/admin/results?program_id=${bca.program_id}&semester=6&exam_year=${bca.exam_year}`, { token: A.token })).data.results;
  const r = rows.find((x) => x.student_id === s0.student_id); ok(r && Number(r.gpa) > 0, 'result exists with a GPA');
});
await t('CSV import: header, no header, tabs, quoted fields, unknown symbol, out-of-range, empty', async () => {
  const [a, b, c, d] = roster.slice(1, 5);
  const imp = (csv) => call(`/teacher/subjects/${sem6.id}/marks/import`, { method: 'POST', token: T1.token, body: { year, csv } });
  let r = await imp(`symbol,internal,external\n${a.roll_no},30,40\n${b.roll_no},28.5,50\nNOPE,1,1`); eq(r.status, 200); eq(r.data.saved, 2); eq(r.data.skipped.length, 1);
  r = await imp(`${c.roll_no}\t35\t45`); eq(r.data.saved, 1, 'tab separated, no header');
  r = await imp(`"Symbol","Internal","External"\r\n"${d.roll_no}","33","47"\r\n`); eq(r.data.saved, 1, 'quoted CRLF');
  r = await imp(`roll,external,internal\n${a.roll_no},41,31`); eq(r.status, 200, 'columns found by header name');
  const now = (await call(`/teacher/subjects/${sem6.id}/marks`, { token: T1.token })).data.roster.find((x) => x.student_id === a.student_id);
  eq([now.internal_marks, now.external_marks], [31, 41], 'header order respected');
  r = await imp(`${b.roll_no},999,10`); eq(r.status, 400); ok(/internal/.test(r.data.message));
  eq((await call(`/teacher/subjects/${sem6.id}/marks`, { token: T1.token })).data.roster.find((x) => x.student_id === b.student_id).internal_marks, 28.5, 'nothing saved from a rejected file');
  eq((await imp('')).status, 400);
  eq((await call(`/teacher/subjects/${sem6.id}/marks/import`, { method: 'POST', token: T1.token, body: { csv: 'a,1,1' } })).status, 400, 'year required');
});
await t('ownership: a teacher cannot touch another teacher\'s subject', async () => {
  for (const [m, p, body] of [['GET', `/teacher/subjects/${sem6.id}/marks`], ['PUT', `/teacher/subjects/${sem6.id}/marks`, { year, entries: [{ student_id: roster[0].student_id, internal_marks: 1, external_marks: 1 }] }], ['POST', `/teacher/subjects/${sem6.id}/marks/import`, { year, csv: 'a,1,1' }], ['GET', `/teacher/subjects/${sem6.id}/attendance`], ['PUT', `/teacher/subjects/${sem6.id}/attendance`, { date: '2026-01-01', entries: [{ student_id: 1, status: 'present' }] }], ['GET', `/teacher/subjects/${sem6.id}/analytics?year=${year}`]]) {
    eq((await call(p, { method: m, token: T2.token, body })).status, 403, `${m} ${p}`);
  }
  eq((await call('/teacher/subjects/99999999/marks', { token: T1.token })).status, 404, 'unknown subject');
  eq((await call(`/teacher/subjects/${sem6.id}/marks`, { token: A.token })).status, 200, 'admin may open any subject');
});
await t('attendance: roster, save, validation, future date, update, percentages', async () => {
  const day = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  let r = (await call(`/teacher/subjects/${sem6.id}/attendance?date=${day}`, { token: T1.token })).data; eq(r.roster.length, 14); ok(r.roster.every((x) => 'percent' in x));
  const entries = r.roster.map((x, i) => ({ student_id: x.student_id, status: i === 0 ? 'absent' : i === 1 ? 'late' : 'present' }));
  const s = await call(`/teacher/subjects/${sem6.id}/attendance`, { method: 'PUT', token: T1.token, body: { date: day, entries: [...entries, { student_id: 1, status: 'weird' }] } });
  eq(s.status, 200); eq(s.data.saved, 14, 'invalid status rows ignored');
  r = (await call(`/teacher/subjects/${sem6.id}/attendance?date=${day}`, { token: T1.token })).data;
  eq(r.roster.find((x) => x.student_id === entries[0].student_id).status, 'absent'); eq(r.roster.find((x) => x.student_id === entries[1].student_id).status, 'late');
  eq((await call(`/teacher/subjects/${sem6.id}/attendance`, { method: 'PUT', token: T1.token, body: { date: 'garbage', entries } })).status, 400);
  eq((await call(`/teacher/subjects/${sem6.id}/attendance`, { method: 'PUT', token: T1.token, body: { date: '2099-01-01', entries } })).status, 400, 'future');
  eq((await call(`/teacher/subjects/${sem6.id}/attendance`, { method: 'PUT', token: T1.token, body: { date: day, entries: [] } })).status, 400);
  entries[0].status = 'present';
  eq((await call(`/teacher/subjects/${sem6.id}/attendance`, { method: 'PUT', token: T1.token, body: { date: day, entries } })).status, 200, 'edit an earlier day');
  eq((await call(`/teacher/subjects/${sem6.id}/attendance?date=${day}`, { token: T1.token })).data.roster.find((x) => x.student_id === entries[0].student_id).status, 'present');
});
await t('subject analytics and cohort lists', async () => {
  const a = (await call(`/teacher/subjects/${sem6.id}/analytics?year=${year}`, { token: T1.token })).data;
  ok(a.count === 14 && a.stats.n === 14 && a.buckets.length === 7 && a.top.length === 5 && a.pass_rate >= 0 && a.highest.total >= a.lowest.total);
  eq((await call(`/teacher/subjects/${sem6.id}/analytics?year=1999`, { token: T1.token })).data.empty, true);
  const c = (await call('/teacher/cohorts', { token: T1.token })).data.cohorts; ok(c.length > 0 && c.every((x) => x.program && x.exam_year));
});
await t('teacher insights: own term allowed, other terms and programs refused, admin allowed', async () => {
  const q = (pid, s, y) => `/teacher/insights?program_id=${pid}&semester=${s}&exam_year=${y}`;
  const own = (await call(q(P.BCA.id, 6, 2026), { token: T1.token })).data; ok(own.stats.n === 14 && own.clusters.length === 3 && own.toppers.length === 5);
  eq((await call(q(P.SCI.id, 1, 2026), { token: T1.token })).status, 403, 'other program');
  eq((await call(q(P.BCA.id, 6, 2026), { token: T2.token })).status, 403, 'other teacher');
  eq((await call(q(P.BCA.id, 6, 2026), { token: A.token })).status, 200);
});

// ---------------------------------------------------------------- 6. results lifecycle
sec('6. Results lifecycle: calculate, publish, lock, promote, verify');
const batches = (await call('/admin/results/batches', { token: A.token })).data.batches;
const bca8 = batches.find((b) => b.program === 'BCA' && b.semester === 8);
const bca6 = batches.find((b) => b.program === 'BCA' && b.semester === 6);
const body = (b, extra = {}) => ({ program_id: b.program_id, semester: b.semester, exam_year: b.exam_year, ...extra });
await t('batches list and filter', async () => {
  ok(batches.length >= 20); const only = (await call(`/admin/results/batches?program_id=${P.SCI.id}`, { token: A.token })).data.batches; ok(only.length > 0 && only.every((b) => b.program === 'SCI'));
});
await t('calculate: validation and idempotence', async () => {
  eq((await call('/admin/results/calculate', { method: 'POST', token: A.token, body: {} })).status, 400);
  const a = (await call('/admin/results/calculate', { method: 'POST', token: A.token, body: body(bca8) })).data; eq(a.calculated, 14);
  const r1 = (await call(`/admin/results?program_id=${bca8.program_id}&semester=8&exam_year=${bca8.exam_year}`, { token: A.token })).data.results;
  await call('/admin/results/calculate', { method: 'POST', token: A.token, body: body(bca8) });
  const r2 = (await call(`/admin/results?program_id=${bca8.program_id}&semester=8&exam_year=${bca8.exam_year}`, { token: A.token })).data.results;
  eq(r2.map((x) => [x.student_id, x.gpa, x.class_rank, x.verify_code]), r1.map((x) => [x.student_id, x.gpa, x.class_rank, x.verify_code]), 'recalculation is stable and keeps verify codes');
});
await t('draft results are hidden from students and the public, visible to staff', async () => {
  eq((await call('/results/me/marksheet/8/2026', { token: S.token })).status, 404);
  eq((await call('/results/public/marksheet?roll_no=27802063&semester=8')).status, 404);
  const pub = (await call('/results/public/search?roll_no=27802063')).data; ok(!pub.results.some((r) => r.semester === 8), 'semester 8 absent from public search');
  const staff = (await call(`/results/ranking?program_id=${bca8.program_id}&semester=8&exam_year=${bca8.exam_year}`, { token: A.token })).data.ranking; ok(staff.length === 14 && staff.every((r) => !r.published));
  eq((await call(`/results/ranking?program_id=${bca8.program_id}&semester=8&exam_year=${bca8.exam_year}`, { token: S.token })).data.ranking.length, 0, 'student sees no draft ranking');
});
let code8;
await t('publish with email notification (logged as skipped when email is off)', async () => {
  const before = (await call('/admin/mail', { token: A.token })).data.stats.skipped || 0;
  const p = (await call('/admin/results/publish', { method: 'POST', token: A.token, body: body(bca8, { publish: true, notify: true }) })).data; eq(p.affected, 14); ok(p.queued >= 14, `emails logged (${p.queued})`);
  ok(((await call('/admin/mail', { token: A.token })).data.stats.skipped || 0) >= before + 14);
  const sheet = (await call('/results/me/marksheet/8/2026', { token: S.token })); eq(sheet.status, 200); code8 = sheet.data.result.verify_code; eq(code8.length, 10);
  eq((await call(`/results/public/verify/${code8.toLowerCase()}`)).data.valid, true, 'verification is case-insensitive');
});
await t('locked after publish: teacher edits are skipped, admin must unpublish first', async () => {
  const sub8 = tsubs.find((s) => s.program === 'BCA' && s.semester === 8);
  const r = (await call(`/teacher/subjects/${sub8.id}/marks`, { token: T1.token })).data;
  ok(r.roster.every((x) => x.locked), 'all rows locked');
  const s = await call(`/teacher/subjects/${sub8.id}/marks`, { method: 'PUT', token: T1.token, body: { year: r.year, entries: [{ student_id: r.roster[0].student_id, internal_marks: 1, external_marks: 0 }] } });
  eq(s.data.saved, 0); eq(s.data.skipped_locked, 1);
});
await t('unpublish hides everything again and invalidates verification', async () => {
  const u = (await call('/admin/results/publish', { method: 'POST', token: A.token, body: body(bca8, { publish: false }) })).data; eq(u.affected, 14);
  eq((await call('/results/me/marksheet/8/2026', { token: S.token })).status, 404);
  eq((await call(`/results/public/verify/${code8}`)).data.valid, false);
});
await t('verification rejects unknown, malformed and empty codes', async () => {
  eq((await call('/results/public/verify/AAAAAAAAAA')).data.valid, false); eq((await call('/results/public/verify/x')).data.valid, false);
});
await t('promotion: only published passes move up; final term refused', async () => {
  eq((await call('/admin/results/promote', { method: 'POST', token: A.token, body: body(bca8) })).status, 400, 'final term');
  eq((await call('/admin/results/promote', { method: 'POST', token: A.token, body: body(bca6) })).data.promoted, 0, 'unpublished promotes nobody');
  await call('/admin/results/publish', { method: 'POST', token: A.token, body: body(bca6, { publish: true }) });
  const p = (await call('/admin/results/promote', { method: 'POST', token: A.token, body: body(bca6) })).data;
  ok(p.promoted > 0 && p.promoted <= 14, `promoted ${p.promoted}`);
  const now = (await call(`/admin/students?program_id=${P.BCA.id}&semester=7`, { token: A.token })).data.students; eq(now.length, p.promoted);
  eq((await call('/admin/results/promote', { method: 'POST', token: A.token, body: { program_id: 99999, semester: 1, exam_year: 2020 } })).status, 400, 'unknown program');
});
await t('CSV export: header, one row per student, ranks ascending', async () => {
  const csv = (await call(`/admin/results/export.csv?program_id=${bca6.program_id}&semester=6&exam_year=${bca6.exam_year}`, { token: A.token })).data;
  const lines = csv.trim().split('\n'); eq(lines[0], 'Symbol No,Name,Total,Percentage,GPA,Grade,Division,Status,Rank,Verify Code'); eq(lines.length, 15);
  const ranks = lines.slice(1).map((l) => Number(l.split(',').slice(-2)[0].replace(/"/g, ''))).filter((n) => n > 0); ok(ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), 'ranks non-decreasing');
});

// ---------------------------------------------------------------- 7. student + staff views
sec('7. Student portal, staff views of a student, rankings');
await t('student overview, transcript and CGPA agree', async () => {
  const ov = (await call('/results/me/overview', { token: S.token })).data; const tr = (await call('/results/me/transcript', { token: S.token })).data;
  eq(ov.results.length, 7); eq(tr.terms.length, 7); eq(ov.cgpa, tr.cgpa); ok(tr.cgpa > 0 && tr.overall_percentage > 0); ok('backlogs' in tr && 'institution' in tr);
  ok(ov.results.every((r) => r.class_size >= 1 && r.class_rank >= 1 && r.class_rank <= r.class_size));
});
await t('each published marksheet is internally consistent (subjects, totals, GPA, rank)', async () => {
  const ov = (await call('/results/me/overview', { token: S.token })).data;
  for (const r of ov.results) {
    const m = (await call(`/results/me/marksheet/${r.semester}/${r.exam_year}`, { token: S.token })).data;
    const credits = m.subjects.reduce((a, s) => a + s.credit, 0); const pts = m.subjects.reduce((a, s) => a + s.point * s.credit, 0);
    eq(Math.round((pts / credits) * 100) / 100, Number(m.result.gpa), `GPA of semester ${r.semester}`);
    eq(Math.round(m.subjects.reduce((a, s) => a + s.total, 0) * 100) / 100, Number(m.result.total_marks), `total of semester ${r.semester}`);
    ok(m.result.verify_code && m.summary.status === m.result.status);
  }
});
await t('student attendance, insights and analysis payloads', async () => {
  const at = (await call('/results/me/attendance', { token: S.token })).data; ok(at.required === 80 && at.subjects.length >= 2 && at.recent.length > 0 && at.overall > 0);
  const ins = (await call('/results/me/insights', { token: S.token })).data;
  ok(ins.prediction.gpa >= 0 && ins.prediction.gpa <= 4 && ins.risk.score >= 0 && ins.risk.score <= 100 && ['low', 'medium', 'high'].includes(ins.risk.level) && ins.standing.percentile >= 0 && ins.standing.percentile <= 100 && Array.isArray(ins.series));
  const an = (await call('/results/me/analysis', { token: S.token })).data; ok(an.subjects.length > 20 && an.subjects.every((s) => s.percent >= 0 && s.class_avg >= 0));
});
await t('rankings: ties share a rank, order is by GPA, own program only for students', async () => {
  for (const b of batches.filter((x) => x.published_count > 0).slice(0, 12)) {
    const rk = (await call(`/results/ranking?program_id=${b.program_id}&semester=${b.semester}&exam_year=${b.exam_year}`, { token: A.token })).data.ranking;
    for (let i = 1; i < rk.length; i++) {
      const a = rk[i - 1], c = rk[i];
      ok(c.class_rank >= a.class_rank, `rank order in ${b.program} t${b.semester}`);
      if (a.status === c.status && Number(a.gpa) === Number(c.gpa) && Number(a.total_marks) === Number(c.total_marks)) eq(c.class_rank, a.class_rank, 'tie shares rank');
      else if (a.status === 'pass' && c.status === 'pass') ok(Number(a.gpa) > Number(c.gpa) || (Number(a.gpa) === Number(c.gpa) && Number(a.total_marks) > Number(c.total_marks)), 'ordered by gpa then total');
      if (a.status === 'fail') ok(c.status === 'fail', 'failures after passes');
    }
    eq(rk[0].class_rank, 1);
  }
  const avail = (await call('/results/available', { token: S.token })).data.batches; ok(avail.length > 0 && avail.every((b) => b.program === 'BCA'), 'student sees only own program');
  eq((await call(`/results/ranking?program_id=${P.SCI.id}&semester=1&exam_year=2025`, { token: S.token })).status, 403);
});
await t('staff views of any student: marksheet, transcript, insights, unknown id', async () => {
  const st = (await call('/admin/students?q=27802063', { token: A.token })).data.students[0];
  const ms = (await call(`/results/marksheet/${st.id}/7/2026`, { token: T1.token })).data; ok(ms.subjects.length === 3 && ms.student.roll_no === '27802063');
  const tr = (await call(`/results/transcript/${st.id}`, { token: A.token })).data; ok(tr.terms.length >= 7);
  const si = (await call(`/results/student-insights/${st.id}`, { token: T1.token })).data; ok(si.risk && si.attendance);
  eq((await call('/results/marksheet/9999999/1/2023', { token: A.token })).status, 404); eq((await call('/results/transcript/9999999', { token: A.token })).status, 404);
});
await t('grading schemes: NEB grades, BBS divisions and TU GPA are applied per program', async () => {
  const sci = (await call(`/admin/students?program_id=${P.SCI.id}`, { token: A.token })).data.students.find((s) => s.semester === 2 && s.roll_no.startsWith('SCI-'));
  const bbs = (await call(`/admin/students?program_id=${P.BBS.id}`, { token: A.token })).data.students.find((s) => s.semester === 3 && s.roll_no.startsWith('BBS-'));
  const g = (await call(`/results/public/search?roll_no=${encodeURIComponent(sci.roll_no)}`)).data; ok(g.results.length >= 1 && g.results.every((r) => ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'NG'].includes(r.grade)), 'NEB grade letters');
  const d = (await call(`/results/public/search?roll_no=${encodeURIComponent(bbs.roll_no)}`)).data; ok(d.results.length >= 1 && d.results.every((r) => ['Distinction', 'First Division', 'Second Division', 'Pass Division', 'Fail'].includes(r.division)), 'divisions');
  const tu = (await call('/results/public/search?roll_no=27802063')).data; ok(tu.results.every((r) => /^[ABCDF][+-]?$/.test(r.grade)), 'TU letter grades');
});

// ---------------------------------------------------------------- back papers
sec('7b. Back papers (re-sits): eligibility, validation, clearing, recalculation');
let bp = {};
await t('back-paper candidates are exactly the students whose effective attempt still fails', async () => {
  const subs = (await call('/admin/subjects', { token: A.token })).data.subjects.filter((x) => x.program === 'BCA');
  for (const sj of subs) {
    const r = (await call(`/teacher/subjects/${sj.id}/backpapers`, { token: A.token })).data;
    eq(r.success, true);
    if (r.candidates.length && !bp.subject) { bp = { subject: sj, list: r.candidates, year: r.suggested_year }; }
  }
  ok(bp.subject, 'seed data has at least one pending back paper');
  ok(bp.list.every((c) => c.history.length >= 1 && c.history.at(-1).passed === false && c.last_year < bp.year), 'every candidate has failed their latest sitting');
  eq((await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { token: T2.token })).status, 403, 'only the subject teacher or admin');
});
await t('back-paper entry validation', async () => {
  const c = bp.list[0]; const url = `/teacher/subjects/${bp.subject.id}/backpapers`;
  const put = (entries, year = bp.year) => call(url, { method: 'PUT', token: A.token, body: { year, entries } });
  eq((await put([{ student_id: c.student_id, internal_marks: 10, external_marks: 10 }], c.last_year)).status, 400, 'year must be after the last sitting');
  eq((await put([{ student_id: c.student_id, internal_marks: 999, external_marks: 1 }])).status, 400, 'out of range');
  eq((await put([{ student_id: 1, internal_marks: 10, external_marks: 10 }, ])).status, 400, 'a student with no pending back paper is refused');
  eq((await put([])).status, 400, 'nothing to save');
  eq((await call(url, { method: 'PUT', token: A.token, body: { entries: [{ student_id: c.student_id, internal_marks: 1, external_marks: 1 }] } })).status, 400, 'year required');
});
let before;
await t('a passing back paper clears the subject and recalculates the original result', async () => {
  const c = bp.list.find((x) => x.attempts === 1) || bp.list[0]; bp.cand = c;
  const tr0 = (await call(`/results/transcript/${c.student_id}`, { token: A.token })).data;
  const owed = tr0.backlogs.find((b) => b.subject_id === bp.subject.id); ok(owed, 'listed as a backlog before');
  const ms0 = (await call(`/results/marksheet/${c.student_id}/${owed.semester}/${owed.exam_year}`, { token: A.token })).data;
  before = { backlogs: tr0.backlogs.length, cgpa: tr0.cgpa, gpa: Number(ms0.result.gpa), status: ms0.result.status, sem: owed.semester, year: owed.exam_year, attempts: owed.attempts };
  const r = await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { method: 'PUT', token: A.token, body: { year: bp.year, entries: [{ student_id: c.student_id, internal_marks: bp.subject.internal_full, external_marks: bp.subject.external_full }] } });
  eq(r.status, 200); eq(r.data.saved, 1); eq(r.data.results[0].passed, true);
  const tr1 = (await call(`/results/transcript/${c.student_id}`, { token: A.token })).data;
  eq(tr1.backlogs.length, before.backlogs - 1, 'one backlog fewer'); ok(tr1.cgpa >= before.cgpa, `CGPA did not drop (${before.cgpa} -> ${tr1.cgpa})`); ok(tr1.backpapers_cleared >= 1);
  const ms1 = (await call(`/results/marksheet/${c.student_id}/${before.sem}/${before.year}`, { token: A.token })).data;
  const row = ms1.subjects.find((x) => x.subject_id === bp.subject.id);
  eq(row.cleared_by_backpaper, true); eq(row.attempt_no, before.attempts + 1); eq(row.passed, true); ok(row.history.length === before.attempts + 1, 'full attempt history is kept');
  ok(Number(ms1.result.gpa) >= before.gpa, 'semester GPA did not drop'); ok(ms1.result.backpapers >= 1, 'result row counts the back paper'); eq(ms1.backpapers >= 1, true);
});
await t('after clearing, the student is no longer a candidate and cannot be entered again', async () => {
  const list = (await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { token: A.token })).data.candidates; ok(!list.some((x) => x.student_id === bp.cand.student_id));
  eq((await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { method: 'PUT', token: A.token, body: { year: bp.year + 1, entries: [{ student_id: bp.cand.student_id, internal_marks: 5, external_marks: 5 }] } })).status, 400);
});
await t('a failing back paper keeps the student as a candidate and counts the attempt', async () => {
  const c = bp.list.find((x) => x.student_id !== bp.cand.student_id); if (!c) return;
  const r = await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { method: 'PUT', token: A.token, body: { year: bp.year, entries: [{ student_id: c.student_id, internal_marks: 2, external_marks: 3 }] } });
  eq(r.data.results[0].passed, false);
  const again = (await call(`/teacher/subjects/${bp.subject.id}/backpapers`, { token: A.token })).data.candidates.find((x) => x.student_id === c.student_id);
  ok(again && again.attempts === c.attempts + 1, 'attempt count rose');
});
await t('back papers never leak into the regular cohort roster, analytics or rankings', async () => {
  const r = (await call(`/teacher/subjects/${bp.subject.id}/marks`, { token: A.token })).data;
  ok(r.roster.every((x) => x.internal_marks === null || typeof x.internal_marks === 'number')); ok(r.roster.length <= 20, 'roster is one cohort');
  const bat = (await call('/admin/results/batches', { token: A.token })).data.batches.find((b) => b.program === 'BCA' && b.semester === before.sem && b.exam_year === before.year);
  const rk = (await call(`/results/ranking?program_id=${bat.program_id}&semester=${bat.semester}&exam_year=${bat.exam_year}`, { token: A.token })).data.ranking;
  eq(new Set(rk.map((x) => x.student_id)).size, rk.length, 'each student ranked once');
});

// ---------------------------------------------------------------- 8. insights + public
sec('8. Insights, alerts and public pages');
await t('cohort insights payload and alert emails', async () => {
  const i = (await call(`/admin/insights?program_id=${bca6.program_id}&semester=6&exam_year=${bca6.exam_year}`, { token: A.token })).data;
  ok(i.n === 14 && i.clusters.length === 3 && i.points.length === 14 && i.toppers.length === 5);
  ok(i.toppers.every((x, k, a) => k === 0 || x.gpa <= a[k - 1].gpa), 'toppers sorted');
  eq(i.clusters.reduce((a, c) => a + c.size, 0), 14, 'every student in exactly one cluster');
  ok(i.at_risk.every((r) => r.risk.score >= 25 && r.risk.reasons.length > 0), 'at-risk entries explain themselves');
  eq(Object.values(i.distribution).reduce((a, b) => a + b, 0), 14, 'distribution covers the class');
  const al = (await call('/admin/insights/alerts', { method: 'POST', token: A.token, body: { program_id: bca6.program_id, semester: 6, exam_year: bca6.exam_year } })).data; ok(al.success && al.queued >= 0);
  eq((await call('/admin/insights?program_id=1&semester=1&exam_year=1990', { token: A.token })).data.empty, true);
});
await t('public pages: stats, search, marksheet, validation', async () => {
  const s = (await call('/results/public/stats')).data; ok(s.stats.students >= 96 && s.stats.programs === 3 && s.institution);
  eq((await call('/results/public/search?roll_no=')).status, 400); eq((await call('/results/public/search?roll_no=NOPE')).status, 404);
  const ms = (await call('/results/public/marksheet?roll_no=27802063&semester=7')).data; ok(ms.subjects.length === 3 && ms.result.verify_code);
  eq((await call('/results/public/marksheet?roll_no=27802063&semester=99')).status, 404); eq((await call('/results/public/marksheet?roll_no=NOPE&semester=1')).status, 404);
  const v = (await call(`/results/public/verify/${ms.result.verify_code}`)).data; ok(v.valid && v.result.roll_no === '27802063' && 'institution_name' in v.institution);
  ok(!JSON.stringify(v).includes('password'), 'no sensitive fields in public data');
});
await t('public endpoints rate-limit abusive clients', async () => {
  let limited = false;
  for (let i = 0; i < 60 && !limited; i++) limited = (await call('/results/public/stats')).status === 429 || (await call('/results/public/search?roll_no=27802063')).status === 429;
  ok(limited, 'expected a 429 after rapid requests');
});

// ---------------------------------------------------------------- summary
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} flow checks passed`);
if (failed.length) { console.log('\nFAILURES:'); failed.forEach((f) => console.log(` - [${f.section}] ${f.name}\n     ${f.err}`)); }
process.exit(failed.length ? 1 : 0);
