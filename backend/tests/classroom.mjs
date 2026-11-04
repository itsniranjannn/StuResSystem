// Daily class automation checks: timetable, today, diary, assignments. Run against a freshly seeded API (node tests/classroom.mjs).
const API = process.env.API || 'http://localhost:5000/api';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).token;

const admin = await login('admin@anka.test', 'Admin@123');
const teacher = await login('teacher1@anka.test', 'Teacher@123');
const student = await login('student@anka.test', 'Student@123');
ok(admin && teacher && student, 'logins');

const tt = await call('GET', '/classroom/timetable', teacher);
ok(tt.success && tt.slots.length > 0, 'teacher timetable has slots');
const mine = tt.slots[0];
const all = await call('GET', '/classroom/timetable', admin);
ok(all.slots.length >= tt.slots.length, 'admin sees every slot');
const st = await call('GET', '/classroom/timetable', student);
ok(st.success && st.slots.every((s) => s.program === st.slots[0].program && s.semester === st.slots[0].semester), 'student sees only own class');

// validation and clash rules
ok((await call('POST', '/classroom/timetable', teacher, { subject_id: mine.subject_id, weekday: 1, start_time: '9am', end_time: '10:00' })).status === 400, 'bad time rejected');
ok((await call('POST', '/classroom/timetable', teacher, { subject_id: mine.subject_id, weekday: 1, start_time: '11:00', end_time: '10:00' })).status === 400, 'end before start rejected');
ok((await call('POST', '/classroom/timetable', teacher, { subject_id: mine.subject_id, weekday: mine.weekday, start_time: mine.start_time, end_time: mine.end_time })).status === 409, 'clash rejected');
ok((await call('POST', '/classroom/timetable', student, { subject_id: mine.subject_id, weekday: 1, start_time: '15:00', end_time: '16:00' })).status === 403, 'student cannot edit timetable');
const other = all.slots.find((s) => !tt.slots.some((m) => m.subject_id === s.subject_id));
ok((await call('POST', '/classroom/timetable', teacher, { subject_id: other.subject_id, weekday: 2, start_time: '15:00', end_time: '16:00' })).status === 403, 'teacher cannot touch another teacher subject');
const added = await call('POST', '/classroom/timetable', teacher, { subject_id: mine.subject_id, weekday: 5, start_time: '16:00', end_time: '17:00', room: 'Lab 9' });
ok(added.status === 201, 'slot added');
const after = await call('GET', '/classroom/timetable', teacher);
const slot = after.slots.find((s) => s.room === 'Lab 9');
ok(!!slot, 'new slot listed');
ok((await call('DELETE', `/classroom/timetable/${slot.id}`, student)).status === 403, 'student cannot delete slot');
ok((await call('DELETE', `/classroom/timetable/${slot.id}`, teacher)).success, 'slot deleted');

ok((await call('GET', '/classroom/today', teacher)).success, 'today (teacher)');
ok((await call('GET', '/classroom/today', student)).success, 'today (student)');

// class diary
const n = new Date(), p = (x) => String(x).padStart(2, '0');
const today = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
ok((await call('PUT', '/classroom/logs', teacher, { subject_id: mine.subject_id, date: today, topic: '' })).status === 400, 'empty topic rejected');
ok((await call('PUT', '/classroom/logs', teacher, { subject_id: mine.subject_id, date: '2999-01-01', topic: 'x' })).status === 400, 'future log rejected');
ok((await call('PUT', '/classroom/logs', teacher, { subject_id: mine.subject_id, date: today, topic: 'Normalisation, 1NF to 3NF', notes: 'Worked examples' })).success, 'log saved');
ok((await call('PUT', '/classroom/logs', teacher, { subject_id: mine.subject_id, date: today, topic: 'Normalisation and BCNF' })).success, 'log updated, not duplicated');
const diary = await call('GET', `/classroom/diary?subject_id=${mine.subject_id}`, teacher);
ok(diary.logs.filter((l) => l.log_date === today).length === 1 && diary.logs[0].topic.includes('BCNF'), 'one log per subject per day');
ok((await call('PUT', '/classroom/logs', student, { subject_id: mine.subject_id, date: today, topic: 'x' })).status === 403, 'student cannot write diary');

// assignments
const bad = await call('POST', '/classroom/assignments', teacher, { subject_id: mine.subject_id, title: 'Lab report', due_date: 'soon' });
ok(bad.status === 400, 'bad due date rejected');
const mk = await call('POST', '/classroom/assignments', teacher, { subject_id: mine.subject_id, title: 'Lab report 1', description: 'ER diagram', due_date: '2026-12-01', max_marks: 10 });
ok(mk.status === 201 && mk.id, 'assignment created');
const sheet = await call('GET', `/classroom/assignments/${mk.id}/status`, teacher);
ok(sheet.success && sheet.roster.length > 0, 'roster loads');
const first = sheet.roster[0];
ok((await call('PUT', `/classroom/assignments/${mk.id}/status`, teacher, { entries: [{ student_id: first.student_id, status: 'submitted', marks: 11 }] })).status === 400, 'marks above maximum rejected');
const saved = await call('PUT', `/classroom/assignments/${mk.id}/status`, teacher, { entries: [{ student_id: first.student_id, status: 'late', marks: 7.5, feedback: 'Add keys' }, { student_id: sheet.roster[1].student_id, status: 'missing' }] });
ok(saved.success && saved.saved === 2, 'statuses saved');
const list = await call('GET', '/classroom/assignments', teacher);
const row = list.assignments.find((a) => a.id === mk.id);
ok(row && row.handed_in === 1 && row.class_size === sheet.roster.length, 'handed-in count');
ok((await call('GET', `/classroom/assignments/${mk.id}/status`, student)).status === 403, 'student cannot open roster');
ok((await call('DELETE', `/classroom/assignments/${mk.id}`, student)).status === 403, 'student cannot delete assignment');
ok((await call('GET', '/classroom/assignments', student)).success, 'student assignment list');
ok((await call('DELETE', `/classroom/assignments/${mk.id}`, teacher)).success, 'assignment deleted');
ok((await call('GET', '/classroom/timetable')).status === 401, 'anonymous blocked');

console.log(`classroom: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
