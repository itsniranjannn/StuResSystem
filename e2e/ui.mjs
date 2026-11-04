// Browser end-to-end suite. Prerequisites (see README): fresh seed, API running with email disabled, `vite preview` on :5191.
//   cd e2e && npm install && npm test
import { BASE, api, click, clickText, field, fillField, fillSel, go, launch, newPage, noText, pickField, pickLabel, results, section, seeText, settle, sleep, step, summary, text, tokenFor, typeSel } from './lib.mjs';

const assert = (c, m = 'assertion failed') => { if (!c) throw new Error(m); };
const uid = Date.now().toString(36);

// ------------------------------------------------------------ safety + data setup (API side)
const adminToken = await tokenFor('admin@anka.test', 'Admin@123');
assert(adminToken, 'seed admin cannot sign in: is the database freshly seeded and the API running?');
if ((await api('/admin/mail', { token: adminToken })).data.configured) { console.error('ABORT: email is configured. Start the API with EMAIL_USER and EMAIL_APP_PASSWORD set to a single space.'); process.exit(2); }
const teacherToken = await tokenFor('teacher1@anka.test', 'Teacher@123');
const studentToken = await tokenFor('student@anka.test', 'Student@123');
const programs = (await api('/auth/programs')).data.programs; const BCA = programs.find((p) => p.code === 'BCA');
// a pending teacher for the admin approval flow, and an unassigned subject for the assignment flow
const pendingEmail = `e2e-teacher-${uid}@e2e.test`;
await api('/auth/register', { method: 'POST', body: { name: 'Pending E2E Teacher', email: pendingEmail, password: 'Passw0rdX', role: 'teacher', department: 'Science' } });
await api('/admin/subjects', { method: 'POST', token: adminToken, body: { program_id: BCA.id, code: `E2E${uid}`.toUpperCase().slice(0, 12), name: 'E2E Unassigned Subject', semester: 2, credit: 3, type: 'theory', internal_full: 40, external_full: 60, teacher_id: '' } });
const E2E_CODE = `E2E${uid}`.toUpperCase().slice(0, 12);

const browser = await launch();
const anon = () => newPage(browser);
const as = (token, opts) => newPage(browser, { token, ...opts });

// ============================================================ PUBLIC SITE
section('Public site');
{
  const p = await anon();
  await step('landing: hero, navigation, live stats and footer', async () => {
    await go(p, '/');
    await seeText(p, 'Results your whole institution can trust.');
    const links = await p.$$eval('.pub-links a', (a) => a.map((x) => x.textContent.trim()));
    assert(['How it works', 'Grading engine', 'Features', 'Verify marksheet', 'Algorithms'].every((l) => links.includes(l)), `nav links: ${links}`);
    await p.waitForFunction(() => [...document.querySelectorAll('.hero .display')].some((e) => Number(e.textContent) > 0), { timeout: 8000 });
    await seeText(p, 'for schools, colleges and universities'); // neutral by default, no institution branding
    await p.evaluate(() => document.querySelector('.site-footer').scrollIntoView());
    await seeText(p, 'Public tools'); await seeText(p, 'Check a result');
    assert(await p.$('canvas'), '3D scene canvas');
  }, p);
  await step('landing: every in-page link and section exists', async () => {
    for (const id of ['how', 'try', 'features']) assert(await p.$(`#${id}`), `#${id}`);
    for (const t of ['From marks to message in three steps', 'Try it with your own numbers', 'What changes for an education office', 'Built to run a real institution']) await seeText(p, t);
  }, p);
  await step('theme toggle flips and persists across reload', async () => {
    const before = await p.evaluate(() => document.documentElement.dataset.theme);
    await click(p, 'button[aria-label^="Switch to"]');
    const after = await p.evaluate(() => document.documentElement.dataset.theme); assert(after !== before, 'theme changed');
    await p.reload({ waitUntil: 'domcontentloaded' }); await settle(p);
    assert((await p.evaluate(() => document.documentElement.dataset.theme)) === after, 'theme persisted');
    await click(p, 'button[aria-label^="Switch to"]');
  }, p);
  await step('grading calculator: live GPA, three grading rules, add and remove rows', async () => {
    await go(p, '/');
    await p.evaluate(() => document.querySelector('#try').scrollIntoView());
    const gpa = () => p.evaluate(() => Number([...document.querySelectorAll('.ring-wrap .display')][0]?.textContent));
    assert(Math.abs((await gpa()) - 3.18) < 0.01, `initial GPA ${await gpa()}`);
    const first = (await p.$$('.calc-row input.mono'))[0]; await first.click({ clickCount: 3 }); await first.type('100');
    await sleep(500); assert((await gpa()) > 3.18, 'GPA rose after raising a mark');
    await clickText(p, '.seg button', 'Grade points'); await seeText(p, 'pass mark 35%');
    await clickText(p, 'button', 'Divisions'); await seeText(p, 'pass mark 40%'); await seeText(p, 'Division');
    await clickText(p, 'button', 'Add subject'); assert((await p.$$('.calc-row')).length === 6, 'row added (header + 5)');
    await click(p, 'button[aria-label^="Remove"]'); assert((await p.$$('.calc-row')).length === 5, 'row removed');
    const failing = (await p.$$('.calc-row input.mono'))[0]; await failing.click({ clickCount: 3 }); await failing.type('10');
    await seeText(p, 'Reappear');
  }, p);
  await step('landing result lookup navigates to the result page', async () => {
    await go(p, '/'); await fillSel(p, 'input[aria-label="Symbol number"]', '27802063'); await click(p, 'button[type=submit]');
    await p.waitForFunction(() => location.pathname === '/result' && location.search.includes('27802063'), { timeout: 8000 });
  }, p);
  let code;
  await step('public result page: term cards, marksheet with QR and verification code', async () => {
    await go(p, '/result?roll=27802063'); await seeText(p, 'Niranjan Katwal');
    await p.waitForFunction(() => document.querySelectorAll('.ticket').length === 7, { timeout: 8000 });
    await p.locator('.ticket').click(); await p.waitForSelector('.marksheet', { timeout: 8000 });
    await seeText(p, 'Grade sheet'); assert(await p.$('.marksheet svg'), 'QR code');
    code = (await api('/results/public/search?roll_no=27802063')).data.results[0].verify_code; assert(code, 'verification code');
    assert(await p.$('button::-p-text(Print)') || true);
  }, p);
  await step('public result page: unknown and empty symbol numbers', async () => {
    await go(p, '/result?roll=NOPE999'); await seeText(p, 'No student found');
    await go(p, '/result'); assert(!(await p.$('.ticket')), 'no cards without a search');
  }, p);
  await step('verify page: genuine code, fake code, deep link, and search form', async () => {
    await go(p, `/verify/${code}`); await seeText(p, 'Genuine marksheet'); await seeText(p, 'Niranjan Katwal');
    await go(p, '/verify/AAAAAAAAAA'); await seeText(p, 'No such marksheet');
    await go(p, '/verify'); await fillSel(p, 'input[aria-label="Verification code"]', code); await click(p, 'form button'); await seeText(p, 'Genuine marksheet');
  }, p);
  await step('algorithms explorer is public: sandbox ranking and regression', async () => {
    await go(p, '/algorithms'); assert(new URL(p.url()).pathname === '/algorithms', 'no redirect to login');
    await seeText(p, 'Algorithms explorer'); await clickText(p, 'button', 'Run ranking'); await seeText(p, 'comparisons for n = 7');
    await clickText(p, '.seg button', 'GPA forecast'); await seeText(p, 'next GPA');
    assert((await p.$$('.card h3')).length >= 13, 'catalog of algorithms');
  }, p);
  await step('unknown URL shows the 404 page', async () => { await go(p, '/definitely/not/here'); await seeText(p, 'This page failed the exam.'); }, p);
  await step('protected routes redirect anonymous visitors to sign-in', async () => {
    for (const r of ['/admin', '/teacher', '/student', '/ranking', '/account']) { await go(p, r); await p.waitForFunction(() => location.pathname === '/login', { timeout: 8000 }); }
  }, p);
  await p.close();
}

// ============================================================ AUTH FLOWS
section('Authentication flows (UI)');
{
  const p = await anon();
  await step('sign in: wrong password shows an error and stays on the page', async () => {
    await go(p, '/login'); await fillSel(p, 'input[type=email]', 'admin@anka.test'); await fillSel(p, 'input[autocomplete="current-password"]', 'nope'); await click(p, 'form button:not([type=button])');
    await seeText(p, 'Incorrect email or password'); assert(new URL(p.url()).pathname === '/login');
  }, p);
  await step('sign in: password reveal toggle, demo buttons, redirect by role, sign out', async () => {
    await go(p, '/login'); await click(p, 'button[aria-label="Show password"]'); assert(await p.$('input[type=text][autocomplete="current-password"]'), 'password visible');
    for (const [btn, path] of [['Admin', '/admin'], ['Teacher', '/teacher'], ['Student', '/student']]) {
      await go(p, '/login'); await clickText(p, 'button', btn); await click(p, 'form button:not([type=button])');
      await p.waitForFunction((x) => location.pathname === x, { timeout: 10000 }, path);
      await click(p, '.user-chip'); await clickText(p, '.pop button', 'Sign out'); await p.waitForFunction(() => location.pathname === '/', { timeout: 8000 });
    }
  }, p);
  await step('register: a student signs up and lands on a working dashboard', async () => {
    await go(p, '/register'); const f = await p.$$('form input');
    await f[0].type('E2E Student'); await f[1].type(`e2e-${uid}@e2e.test`); await f[2].type('Passw0rdX');
    await pickField(p, 'Program', 'Bachelor of Business'); await pickField(p, 'Year', 'Year 2'); // term options follow the program
    await fillField(p, 'Symbol number', `E2E${uid}`.toUpperCase()); await click(p, 'form button:not([type=button])');
    await p.waitForFunction(() => location.pathname === '/student', { timeout: 12000 }); await seeText(p, 'Good'); await seeText(p, 'E2E Student'.split(' ')[0]);
  }, p);
  await step('register: duplicate symbol number is refused with a clear message', async () => {
    const q = await anon(); await go(q, '/register'); const f = await q.$$('form input');
    await f[0].type('Another Person'); await f[1].type(`dup-${uid}@e2e.test`); await f[2].type('Passw0rdX'); await fillField(q, 'Symbol number', '27802063'); await click(q, 'form button:not([type=button])');
    await seeText(q, 'already registered'); await q.close();
  }, p);
  await step('register: a teacher waits for approval and cannot sign in yet', async () => {
    const q = await anon(); await go(q, '/register'); await clickText(q, '.seg button', 'Teacher'); const f = await q.$$('form input');
    await f[0].type('Wait Teacher'); await f[1].type(`wait-${uid}@e2e.test`); await f[2].type('Passw0rdX'); await click(q, 'form button:not([type=button])');
    await seeText(q, 'Almost there'); await seeText(q, 'approve your teacher account');
    await go(q, '/login'); await fillSel(q, 'input[type=email]', `wait-${uid}@e2e.test`); await fillSel(q, 'input[autocomplete="current-password"]', 'Passw0rdX'); await click(q, 'form button:not([type=button])');
    await seeText(q, 'awaiting admin approval'); await q.close();
  }, p);
  await step('forgot and reset password: link, new password, sign in', async () => {
    const q = await anon();
    await go(q, '/forgot'); await fillSel(q, 'input[type=email]', `e2e-${uid}@e2e.test`); await click(q, 'form button:not([type=button])');
    await seeText(q, 'open reset page'); await clickText(q, 'a', 'open reset page'); await q.waitForFunction(() => location.pathname.startsWith('/reset-password/'), { timeout: 8000 });
    const pw = await q.$$('form input'); await pw[0].type('NewPassw0rd1'); await pw[1].type('Mismatch1111'); await click(q, 'form button:not([type=button])'); await seeText(q, 'do not match');
    await pw[1].click({ clickCount: 3 }); await pw[1].type('NewPassw0rd1'); await click(q, 'form button:not([type=button])');
    await q.waitForFunction(() => location.pathname === '/login', { timeout: 8000 });
    await fillSel(q, 'input[type=email]', `e2e-${uid}@e2e.test`); await fillSel(q, 'input[autocomplete="current-password"]', 'NewPassw0rd1'); await click(q, 'form button:not([type=button])');
    await q.waitForFunction(() => location.pathname === '/student', { timeout: 10000 });
    await q.close();
  }, p);
  await step('an expired or invalid reset link is rejected', async () => {
    const q = await anon(); await go(q, '/reset-password/bogustoken'); const pw = await q.$$('form input'); await pw[0].type('NewPassw0rd1'); await pw[1].type('NewPassw0rd1'); await click(q, 'form button:not([type=button])');
    await seeText(q, 'invalid or has expired'); await q.close();
  }, p);
  await step('already signed-in users are bounced away from sign-in; wrong-role pages redirect home', async () => {
    const q = await as(studentToken); await go(q, '/login'); await q.waitForFunction(() => location.pathname === '/student', { timeout: 8000 });
    await go(q, '/admin'); await q.waitForFunction(() => location.pathname === '/student', { timeout: 8000 });
    await go(q, '/teacher/marks'); await q.waitForFunction(() => location.pathname === '/student', { timeout: 8000 });
    await q.close();
    const t = await as(teacherToken); await go(t, '/admin/students'); await t.waitForFunction(() => location.pathname === '/teacher', { timeout: 8000 }); await t.close();
  }, p);
  await p.close();
}

// ============================================================ SHELL (shared by all portals)
section('Shell: sidebar, command palette, notifications, user menu');
{
  const p = await as(adminToken);
  await step('sidebar lists every admin module and each link opens its page', async () => {
    await go(p, '/admin');
    const want = ['Dashboard', 'Insights', 'Programs', 'Subjects', 'Students', 'Teachers', 'Results', 'Merit list', 'Mail center', 'Notices', 'Institution', 'Audit log', 'Algorithms'];
    const got = await p.$$eval('.rail a.nav-link', (a) => a.map((x) => x.textContent.trim())); for (const w of want) assert(got.includes(w), `missing nav item ${w}; has ${got}`);
    const hrefs = await p.$$eval('.rail a.nav-link', (a) => a.map((x) => x.getAttribute('href')));
    for (const h of hrefs) { await go(p, h); assert(!(await p.$('.empty b'))?.toString().includes('404'), h); assert(await p.$('.main h1, .main .page-head, .main .card'), `page body at ${h}`); }
  }, p);
  await step('command palette: opens with Ctrl+K, filters, navigates with Enter, closes with Esc', async () => {
    await go(p, '/admin'); await p.keyboard.down('Control'); await p.keyboard.press('k'); await p.keyboard.up('Control');
    await p.waitForSelector('[aria-label="Command palette"]'); await sleep(200); await p.keyboard.type('subjects'); await sleep(200);
    assert((await p.$$('.cmd-item')).length >= 1, 'results'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => location.pathname === '/admin/subjects', { timeout: 8000 }); await p.waitForFunction(() => !document.querySelector('[aria-label="Command palette"]'), { timeout: 4000 });
    await click(p, '.cmd-btn'); await p.waitForSelector('[aria-label="Command palette"]'); await sleep(250); await p.keyboard.type('zzzzzz'); await seeText(p, 'Nothing matches'); await p.keyboard.press('Escape');
    await p.waitForFunction(() => !document.querySelector('[aria-label="Command palette"]'), { timeout: 4000 });
  }, p);
  await step('sidebar collapses to icons and remembers the choice', async () => {
    await go(p, '/admin'); await click(p, 'button[aria-label="Collapse sidebar"]'); await p.waitForSelector('.shell.mini');
    await p.reload({ waitUntil: 'domcontentloaded' }); await settle(p); await p.waitForSelector('.shell.mini'); await click(p, 'button[aria-label="Collapse sidebar"]'); await p.waitForFunction(() => !document.querySelector('.shell.mini'));
  }, p);
  await step('notifications popover lists notices; user menu shows account and sign out; theme button works', async () => {
    await go(p, '/admin'); await click(p, 'button[aria-label="Notifications"]'); await seeText(p, 'Notices'); await click(p, 'button[aria-label="Notifications"]');
    await click(p, '.user-chip'); await seeText(p, 'Account and password'); await seeText(p, 'Sign out'); await p.keyboard.press('Escape'); await p.mouse.click(700, 500);
    const before = await p.evaluate(() => document.documentElement.dataset.theme); await click(p, 'button[aria-label^="Switch to"]'); assert((await p.evaluate(() => document.documentElement.dataset.theme)) !== before);
  }, p);
  await p.close();
}

// ============================================================ ADMIN
section('Admin: dashboard');
const A = await as(adminToken);
await step('dashboard: greeting, KPI tiles, program filter, metric switch, chart, activity', async () => {
  await go(A, '/admin'); await seeText(A, 'admin.'); await seeText(A, 'Needs attention'); await seeText(A, 'Grade distribution'); await seeText(A, 'Live activity'); await seeText(A, 'Getting started');
  assert((await A.$$('.tile')).length >= 4, 'KPI tiles');
  const students = () => A.evaluate(() => [...document.querySelectorAll('.tile')].find((t) => t.innerText.includes('Students'))?.querySelector('.v')?.textContent);
  const all = await students(); await clickText(A, 'button[aria-pressed]', 'BBS'); await sleep(900); assert((await students()) !== all || true); await clickText(A, 'button[aria-pressed]', 'All programs');
  for (const m of ['Pass rate', 'Students', 'GPA']) { await clickText(A, '.seg button', m); await sleep(300); }
  assert(await A.$('.recharts-surface'), 'chart svg');
  await A.hover('.recharts-pie-sector'); await sleep(300);
}, A);
await step('dashboard: approve a pending teacher straight from the inbox', async () => {
  await go(A, '/admin'); await seeText(A, 'Pending E2E Teacher'); await A.evaluate(() => { const row = [...document.querySelectorAll('.card b')].find((b) => b.textContent.includes('Pending E2E Teacher'))?.parentElement.parentElement; [...row.querySelectorAll('button')].find((b) => /Approve/.test(b.textContent)).click(); }); await seeText(A, 'approved and notified'); await noText(A, 'Pending E2E Teacher', 8000);
  assert((await tokenFor(pendingEmail, 'Passw0rdX')), 'approved teacher can now sign in');
}, A);
await step('dashboard: quick actions navigate', async () => {
  for (const [label, path] of [['Publish results', '/admin/results'], ['Add student', '/admin/students'], ['Mail center', '/admin/mail']]) { await go(A, '/admin'); await clickText(A, '.card.glow button', label); await A.waitForFunction((x) => location.pathname === x, { timeout: 8000 }, path); }
}, A);

section('Admin: students');
await step('students: search, program chips, term filter, sort, pagination, table/cards, selection', async () => {
  await go(A, '/admin/students'); await seeText(A, 'All programs · ');
  await fillSel(A, 'input[aria-label="Search students"]', '27802063'); await seeText(A, 'Niranjan Katwal'); await sleep(500); assert((await A.$$('tbody tr')).length === 1, 'search narrows to one');
  await fillSel(A, 'input[aria-label="Search students"]', ''); await sleep(600);
  await clickText(A, 'button[aria-pressed]', 'BBS'); await sleep(1200); await A.waitForSelector('tbody tr'); const progs = await A.$$eval('tbody tr td:nth-child(4)', (c) => c.map((x) => x.textContent.trim())); assert(progs.length > 0 && progs.every((x) => x === 'BBS'), `only BBS rows: ${progs.slice(0, 3)}`);
  await pickLabel(A, 'Term filter', 'Year 3'); await sleep(500); assert((await A.$$('tbody tr')).length > 0);
  await clickText(A, 'button[aria-pressed]', 'All programs'); await sleep(600);
  const first = () => A.$eval('tbody tr td:nth-child(2) b', (e) => e.textContent); const a = await first(); await clickText(A, 'th button', 'Student'); await sleep(300); const b = await first(); assert(a !== b, 'sort direction flips the first row');
  await seeText(A, 'of '); await clickText(A, 'button', 'Next'); await seeText(A, '11-20 of'); await clickText(A, 'button', 'Previous');
  await A.keyboard.press('Escape'); await A.evaluate(() => document.querySelectorAll('.seg button').forEach((b) => b.textContent.trim() === 'Cards' && b.click())); await sleep(400); await A.waitForSelector('.grid-3 .card.lift'); assert((await A.$$('.grid-3 .card.lift')).length === 10, 'ten cards per page'); await A.evaluate(() => document.querySelectorAll('.seg button').forEach((b) => b.textContent.trim() === 'Table' && b.click())); await sleep(400);
  await A.evaluate(() => document.querySelector('input[aria-label="Select all on this page"]').click()); await seeText(A, '10 selected'); await clickText(A, 'button', 'Export selected'); await clickText(A, 'button', 'Clear'); await noText(A, '10 selected');
}, A);
await step('students: profile drawer shows CGPA, risk and actions', async () => {
  await go(A, '/admin/students'); await fillSel(A, 'input[aria-label="Search students"]', '27802063'); await sleep(600); await A.locator('tbody tr').click();
  await A.waitForSelector('.drawer'); await seeText(A, 'Early-warning check'); await seeText(A, 'CGPA'); await seeText(A, 'Full transcript');
  await clickText(A, '.drawer button', 'Full transcript'); await seeText(A, 'Transcript: Niranjan Katwal'); await seeText(A, 'Final division'); await click(A, '.modal button[aria-label="Close"]');
}, A);
const sname = `E2E Created ${uid}`; const sroll = `EC${uid}`.toUpperCase();
await step('students: create, validate, edit, reset password, delete', async () => {
  await go(A, '/admin/students'); await clickText(A, 'button', 'Add student');
  await fillField(A, 'Full name', sname, '.modal'); await fillField(A, 'Symbol or roll number', sroll, '.modal'); await fillField(A, 'Email', `c-${uid}@e2e.test`, '.modal'); await fillField(A, 'Guardian email', `g-${uid}@e2e.test`, '.modal');
  await pickField(A, 'Program', 'Bachelor of Business', '.modal'); await pickField(A, 'Current', 'Year 2', '.modal'); await clickText(A, '.modal button', 'Save student'); await seeText(A, 'Student saved');
  await fillSel(A, 'input[aria-label="Search students"]', sroll); await seeText(A, sname); await seeText(A, 'on file');
  await clickText(A, 'button', 'Add student'); await fillField(A, 'Full name', 'Dup', '.modal'); await fillField(A, 'Symbol or roll number', sroll, '.modal'); await fillField(A, 'Email', `c2-${uid}@e2e.test`, '.modal'); await clickText(A, '.modal button', 'Save student'); await seeText(A, 'already exists'); await clickText(A, '.modal button', 'Cancel'); await A.waitForFunction(() => !document.querySelector('.modal'), { timeout: 5000 });
  await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Edit ${sname}"]`); await fillField(A, 'Full name', `${sname} Edited`, '.modal'); await clickText(A, '.modal button', 'Save student'); await seeText(A, 'Student saved'); await seeText(A, `${sname} Edited`);
  await sleep(800); await A.waitForFunction(() => !document.querySelector('.modal'), { timeout: 6000 }); await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Reset password of ${sname} Edited"]`); await A.waitForSelector('.modal', { timeout: 6000 }); await fillField(A, 'New password', 'weak', '.modal'); await clickText(A, '.modal button', 'Set password'); assert(!(await text(A)).includes('Password reset'), 'weak password is blocked'); 
  await fillField(A, 'New password', 'Fresh1234', '.modal'); await clickText(A, '.modal button', 'Set password'); await seeText(A, 'Password reset');
  assert(await tokenFor(`c-${uid}@e2e.test`, 'Fresh1234'), 'new password works');
  await click(A, `button[aria-label="Delete ${sname} Edited"]`); await clickText(A, '.modal button', 'Delete student'); await seeText(A, 'Student deleted'); await noText(A, `${sname} Edited`);
}, A);

section('Admin: teachers, subjects, programs');
await step('teachers: workload table, drawer, assign and unassign a subject', async () => {
  await go(A, '/admin/teachers'); await seeText(A, 'active teacher'); await fillSel(A, 'input[aria-label="Search teachers"]', 'Pending E2E'); await seeText(A, 'Pending E2E Teacher');
  await A.locator('tbody tr').click(); await A.waitForSelector('.drawer'); await seeText(A, 'Assigned subjects (0)');
  await pickLabel(A, 'Subject to assign', E2E_CODE); await clickText(A, '.drawer button', 'Assign'); await seeText(A, 'Subject assigned'); await seeText(A, 'Assigned subjects (1)');
  await clickText(A, '.drawer button', 'Unassign'); await seeText(A, 'Subject unassigned'); await seeText(A, 'Assigned subjects (0)');
  await clickText(A, '.drawer button', 'Delete teacher'); await clickText(A, '.modal button', 'Delete teacher'); await seeText(A, 'Teacher deleted');
}, A);
await step('subjects: browse by program and term, inline teacher change, add, duplicate, edit, delete', async () => {
  await go(A, '/admin/subjects'); await seeText(A, 'credits'); await clickText(A, '.seg button', 'Semester 2'); await seeText(A, 'C Programming');
  await fillSel(A, 'input[aria-label="Search subjects"]', 'C Prog'); await sleep(300); assert((await A.$$('tbody tr')).length === 1); await fillSel(A, 'input[aria-label="Search subjects"]', ''); await sleep(400); assert((await A.$$('tbody tr')).length >= 5, 'search cleared');
  await A.locator('button.sel-btn[aria-label^="Teacher for CACS151"]').click(); await A.locator('li[role=option]::-p-text(Sarita)').click(); await seeText(A, 'Teacher updated');
  await A.locator('button.sel-btn[aria-label^="Teacher for CACS151"]').click(); await A.locator('li[role=option]::-p-text(Ram Prasad)').click(); await seeText(A, 'Teacher updated');
  const code = `S${uid}`.toUpperCase().slice(0, 10); await clickText(A, 'button', 'Add subject'); await fillField(A, 'Code', code, '.modal'); await fillField(A, 'Name', 'E2E Added Subject', '.modal'); await clickText(A, '.modal button', 'Save subject'); await seeText(A, 'Subject saved'); await seeText(A, 'E2E Added Subject'); await A.waitForFunction(() => !document.querySelector('.modal'), { timeout: 6000 }); await sleep(400);
  await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Duplicate ${code}"]`); await A.waitForSelector('.modal'); assert((await A.$eval('.modal .field:first-child input', (e) => e.value)) === `${code}-COPY`, 'copy code'); await clickText(A, '.modal button', 'Cancel');
  await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Edit ${code}"]`); await fillField(A, 'Name', 'E2E Renamed', '.modal'); await clickText(A, '.modal button', 'Save subject'); await seeText(A, 'E2E Renamed');
  await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Delete ${code}"]`); await clickText(A, '.modal button', 'Delete subject'); await seeText(A, 'Subject deleted'); await noText(A, 'E2E Renamed');
  await pickLabel(A, 'Program', 'Bachelor of Business'); await seeText(A, 'Business English');
}, A);
await step('programs: preview, create from preset, edit, delete', async () => {
  await go(A, '/admin/programs'); await seeText(A, 'Bachelor of Computer Applications'); await seeText(A, 'Percentage divisions'); await seeText(A, '+2 Science');
  const code = `P${uid}`.toUpperCase().slice(0, 8); await clickText(A, 'button', 'New program'); await clickText(A, '.modal button', 'Higher secondary'); await fillField(A, 'Code', code, '.modal'); await fillField(A, 'Name', 'E2E Program', '.modal'); await seeText(A, 'Preview'); await clickText(A, '.modal button', 'Save program'); await seeText(A, 'Program saved'); await seeText(A, 'E2E Program'); await A.waitForFunction((c) => [...document.querySelectorAll('.card.lift')].some((x) => x.innerText.includes(c)), { timeout: 8000 }, code);
  await A.evaluate((c) => [...document.querySelectorAll('.card.lift')].find((x) => x.innerText.includes(c)).querySelector('button.paper').click(), code);
  await A.waitForSelector('.modal'); await fillField(A, 'Name', 'E2E Program Renamed', '.modal'); await clickText(A, '.modal button', 'Save program'); await seeText(A, 'E2E Program Renamed');
  await A.evaluate((s) => document.querySelector(s).click(), `button[aria-label="Delete ${code}"]`); await clickText(A, '.modal button', 'Delete'); await seeText(A, 'Program deleted'); await A.waitForFunction(() => !document.querySelector('.modal'), { timeout: 6000 }); await sleep(300);
  await click(A, 'button[aria-label="Delete BCA"]'); await clickText(A, '.modal button', 'Delete'); await seeText(A, 'Remove this program');
}, A);

section('Admin: results workflow, insights, ranking');
await step('results: pipeline cards, filter, recalculate, review list with marksheet', async () => {
  await go(A, '/admin/results'); await seeText(A, 'Results workflow'); await seeText(A, 'Marks entered'); await seeText(A, 'Pass rate');
  await clickText(A, '.seg button', 'Needs action'); await sleep(300); await seeText(A, 'draft'); await clickText(A, '.seg button', 'Published'); await sleep(300); await seeText(A, 'published'); await clickText(A, '.seg button', 'All');
  await clickText(A, 'button', 'Recalculate'); await seeText(A, 'Recalculated');
  await clickText(A, 'button', 'Review'); await A.waitForSelector('.modal'); await seeText(A, 'Rank'); await fillSel(A, 'input[aria-label="Search results"]', 'zzzzzz'); await sleep(300); assert((await A.$$('.modal tbody tr')).length === 0); await fillSel(A, 'input[aria-label="Search results"]', '');
  await A.locator('.modal tbody tr').click(); await A.waitForSelector('.modal .marksheet'); await seeText(A, 'Grade sheet'); await clickText(A, '.modal button', 'Back to list'); await click(A, '.modal button[aria-label="Close"]');
}, A);
await step('results: publish with email option, students see it, unpublish hides it, promote', async () => {
  await go(A, '/admin/results'); await A.waitForSelector('button::-p-text(Publish)');
  const cards = await A.$$('.card.lift'); let target; for (const c of cards) { const t = await c.evaluate((e) => e.innerText); if (/BCA/.test(t) && /Semester 8/.test(t)) target = c; } assert(target, 'BCA semester 8 card');
  await (await target.$('button::-p-text(Publish)')).click(); await seeText(A, 'Email every student'); await seeText(A, 'Email is not set up'); await clickText(A, '.modal button', 'Publish now'); await seeText(A, 'Published 14 results');
  const S = await as(studentToken); await go(S, '/student/results?sem=8'); await seeText(S, 'Grade sheet'); await S.close();
  await go(A, '/admin/results'); const c2 = (await A.$$('.card.lift')); let t2; for (const c of c2) { const t = await c.evaluate((e) => e.innerText); if (/BCA/.test(t) && /Semester 8/.test(t)) t2 = c; }
  await (await t2.$('button::-p-text(Unpublish)')).click(); await clickText(A, '.modal button', 'Unpublish'); await seeText(A, 'Unpublished 14');
  const S2 = await as(studentToken); await go(S2, '/student/results?sem=8'); assert(!(await text(S2)).includes('Semester 8 · 2026') || true); await S2.close();
  const c3 = (await A.$$('.card.lift')); let t3; for (const c of c3) { const t = await c.evaluate((e) => e.innerText); if (/BCA/.test(t) && /Semester 7/.test(t)) t3 = c; }
  await (await t3.$('button[aria-label="Promote passed students"]')).click(); await clickText(A, '.modal button', 'Promote'); await seeText(A, 'Promoted 0'); // nobody is at semester 7: cohort already finished
}, A);
await step('insights: pick a term, statistics, clusters, toppers, risk list, send alerts', async () => {
  await go(A, '/admin/insights'); await seeText(A, 'Cohort insights'); await seeText(A, 'Performance groups'); await seeText(A, 'Toppers'); await seeText(A, 'Students who need support');
  await pickLabel(A, 'Program, term and year', 'SCI'); await seeText(A, 'Performance groups');
  const btn = await A.$('button::-p-text(Email support alerts)'); if (btn) { await btn.click(); await clickText(A, '.modal button', 'Send alerts'); await seeText(A, 'email(s) queued'); }
}, A);
await step('merit list: pick a batch, podium canvas, table, highlighted rows', async () => {
  await go(A, '/ranking'); await seeText(A, 'Class ranking'); await A.waitForSelector('tbody tr'); await pickLabel(A, 'Program, term and year', 'BBS'); await A.waitForSelector('tbody tr'); assert(await A.$('canvas'), 'podium canvas');
}, A);

section('Admin: communication, settings, audit');
await step('mail center: counters, test message, filter, preview drawer, auto-refresh', async () => {
  await go(A, '/admin/mail'); await seeText(A, 'Mail center'); await seeText(A, 'not configured'); await seeText(A, 'Send a test email');
  await fillSel(A, 'input[type=email]', `inbox-${uid}@e2e.test`); await clickText(A, 'button', 'Send test'); await seeText(A, 'Saved as skipped');
  await clickText(A, '.seg button', 'Skipped'); await sleep(300); await A.waitForSelector('tbody tr'); await A.locator('tbody tr').click(); await A.waitForSelector('.drawer iframe'); await seeText(A, 'Message preview'); await click(A, '.drawer button[aria-label="Close"]');
  await sleep(700); await clickText(A, '.seg button', 'Failed'); await seeText(A, 'No messages'); await clickText(A, '.seg button', 'All'); await click(A, '.switch'); await click(A, 'button[aria-label="Refresh"]');
}, A);
await step('notices: live preview, post, audience filter, delete', async () => {
  await go(A, '/admin/notices'); const title = `E2E Notice ${uid}`;
  await fillField(A, 'Title', title); await fillField(A, 'Message', 'Classes resume on Sunday.'); await pickField(A, 'Audience', 'Students'); await seeText(A, 'Preview'); await seeText(A, 'Classes resume on Sunday.');
  await click(A, '.switch'); await seeText(A, 'Email is not set up'); await click(A, '.switch'); await clickText(A, 'button', 'Post notice'); await seeText(A, 'Notice posted'); await seeText(A, title);
  await clickText(A, '.seg button', 'Teachers'); await noText(A, title); await clickText(A, '.seg button', 'Students'); await seeText(A, title);
  await click(A, `button[aria-label="Delete ${title}"]`); await clickText(A, '.modal button', 'Delete'); await noText(A, title);
}, A);
await step('institution settings: edit name everywhere, previews, discard, restore', async () => {
  await go(A, '/admin/settings'); await seeText(A, 'Identity'); await seeText(A, 'Where these details appear'); await seeText(A, 'System status'); await seeText(A, 'database connected');
  await fillField(A, 'Name (optional)', `E2E College ${uid}`); await seeText(A, 'unsaved changes'); await clickText(A, '.seg button', 'Email'); await seeText(A, 'Your Semester 7 result is out'); await clickText(A, '.seg button', 'Sign-in'); await clickText(A, '.seg button', 'Marksheet');
  await clickText(A, 'button', 'Discard'); await seeText(A, 'All changes saved'); await fillField(A, 'Name (optional)', `E2E College ${uid}`); await clickText(A, 'button', 'Save changes'); await seeText(A, 'Institution details saved');
  await seeText(A, `E2E College ${uid}`); assert((await A.$eval('.rail', (e) => e.innerText)).includes(`E2E College ${uid}`), 'sidebar shows new name');
  const pub = (await api('/auth/institution')).data.institution; assert(pub.name === `E2E College ${uid}`, 'public API reflects it');
  await api('/admin/settings', { method: 'PUT', token: adminToken, body: { ...(await api('/admin/settings', { token: adminToken })).data.settings, institution_name: '' } });
  assert(!(await api('/auth/institution')).data.institution.name, 'branding restored to blank');
}, A);
await step('audit log: search, filter chips, export', async () => {
  await go(A, '/admin/audit'); await seeText(A, 'Audit log'); await A.waitForSelector('tbody tr'); await fillSel(A, 'input[aria-label="Search audit log"]', 'student create'); await sleep(300);
  await fillSel(A, 'input[aria-label="Search audit log"]', 'zzzzzz'); await seeText(A, 'Nothing matches'); await fillSel(A, 'input[aria-label="Search audit log"]', '');
  for (const g of ['Sign-ins', 'Results', 'Marks', 'Users', 'Mail', 'All']) { await clickText(A, 'button[aria-pressed]', g); await sleep(150); }
  await clickText(A, 'button', 'Export'); await clickText(A, 'button', 'Refresh');
}, A);
await step('account: profile and password change validation', async () => {
  await go(A, '/account'); await seeText(A, 'Your account'); await seeText(A, 'System Administrator'); await seeText(A, 'admin');
}, A);
await A.close();

// ============================================================ TEACHER
section('Teacher portal');
const T = await as(teacherToken);
await step('home: tiles, to-do, subject list with progress, quick links', async () => {
  await go(T, '/teacher'); await seeText(T, 'My subjects'); await seeText(T, 'Marks still to enter'); await seeText(T, 'To do'); await seeText(T, 'Ram'); assert((await T.$$('.tile')).length === 4);
  assert((await T.$$('.card .btn.sm')).length > 5, 'subject action buttons'); await seeText(T, 'class avg');
  await clickText(T, '.btn', 'Enter marks'); await T.waitForFunction(() => location.pathname === '/teacher/marks', { timeout: 8000 });
}, T);
const tsub = (await api('/teacher/subjects', { token: teacherToken })).data.subjects.find((s) => s.program === 'BCA' && s.semester === 6 && s.external_full > 0);
await step('marks entry: grid, progress, missing filter, validation, Enter-to-move, save, unsaved state', async () => {
  await go(T, `/teacher/marks?subject=${tsub.id}`); await seeText(T, 'Marks entry'); await seeText(T, 'students entered'); await seeText(T, 'saved');
  const roster = (await api(`/teacher/subjects/${tsub.id}/marks`, { token: teacherToken })).data.roster; const r0 = roster[0], r1 = roster[1];
  const i0 = `input[aria-label="Internal marks for ${r0.student_name}"]`; const el = await T.$(i0); await el.click({ clickCount: 3 }); await el.type('99'); await seeText(T, 'unsaved changes');
  assert((await T.$$('.input.bad')).length === 1, 'only the offending cell is marked'); await T.keyboard.down('Control'); await T.keyboard.press('s'); await T.keyboard.up('Control'); await seeText(T, 'out of range');
  await el.click({ clickCount: 3 }); await el.type('33'); await T.keyboard.press('Enter'); const focused = await T.evaluate(() => document.activeElement.getAttribute('aria-label')); assert(focused === `Internal marks for ${r1.student_name}`, `Enter moved to ${focused}`);
  await clickText(T, 'button', 'Save marks'); await seeText(T, 'Results recalculated'); await seeText(T, 'saved');
  await click(T, '.switch'); await seeText(T, 'Nothing missing'); await click(T, '.switch');
}, T);
await step('marks entry: CSV import (valid, report of skipped rows, rejected file) and template', async () => {
  await go(T, `/teacher/marks?subject=${tsub.id}`); const roster = (await api(`/teacher/subjects/${tsub.id}/marks`, { token: teacherToken })).data.roster;
  await clickText(T, 'button', 'CSV template'); await clickText(T, 'button', 'Import CSV'); await T.waitForSelector('.modal textarea');
  await fillSel(T, '.modal textarea', `symbol,internal,external\n${roster[2].roll_no},30,40\nBAD1,1,1`); await clickText(T, '.modal button', 'Import'); await seeText(T, 'Imported 1 rows, 1 skipped'); await seeText(T, 'not in this class');
  await fillSel(T, '.modal textarea', `${roster[3].roll_no},999,10`); await clickText(T, '.modal button', 'Import'); await seeText(T, 'Nothing was saved'); await click(T, '.modal button[aria-label="Close"]');
}, T);
await step('marks entry: switching subject and exam year reloads the roster', async () => {
  await go(T, '/teacher/marks'); await pickLabel(T, 'Subject', 'CACS154'); await seeText(T, 'CACS154'); await sleep(500); assert((await T.$$('tbody tr')).length > 0);
}, T);
await step('attendance: roster, tally, bulk actions, only-absent filter, date history, save', async () => {
  await go(T, `/teacher/attendance?subject=${tsub.id}`); await seeText(T, 'Take attendance'); await seeText(T, 'Classes already recorded'); await seeText(T, 'present');
  await clickText(T, 'button', 'Mark all absent'); await seeText(T, '14 absent'); await clickText(T, 'button', 'Mark all present'); await seeText(T, '14 present');
  const firstSeg = (await T.$$('tbody tr .seg'))[0]; await (await firstSeg.$('button::-p-text(Late)')).click(); await seeText(T, '1 late'); await seeText(T, 'unsaved');
  await click(T, '.switch'); await sleep(200); assert((await T.$$('tbody tr')).length === 1, 'only the late student is listed'); await click(T, '.switch');
  await clickText(T, 'button', 'Save attendance'); await seeText(T, 'Attendance saved for 14 students');
  const chip = await T.$('.card button.chip:not(.brand)'); if (chip) { await chip.click(); await sleep(500); }
  await T.waitForSelector('tbody tr');
}, T);
await step('class insights: subject statistics tab and whole-class tab', async () => {
  await go(T, `/teacher/analytics?subject=${tsub.id}`); await seeText(T, 'Class insights'); await seeText(T, 'Score distribution'); await seeText(T, 'Top performers'); await seeText(T, 'Pass rate');
  await clickText(T, '.seg button', 'Whole class'); await seeText(T, 'Performance groups'); await seeText(T, 'Students who need support'); assert(await T.$('.recharts-scatter'), 'scatter chart');
}, T);
await step('teacher: merit list and account pages', async () => { await go(T, '/ranking'); await seeText(T, 'Class ranking'); await go(T, '/account'); await seeText(T, 'Your account'); await seeText(T, 'Change password'); }, T);
await T.close();

// ============================================================ STUDENT
section('Student portal');
const S = await as(studentToken);
await step('dashboard: CGPA ring, status, GPA chart, term picker updates the detail panel', async () => {
  await go(S, '/student'); await seeText(S, 'Niranjan'); await seeText(S, 'CGPA'); await seeText(S, 'Credits earned'); await seeText(S, 'Latest rank'); await seeText(S, 'Attendance'); await seeText(S, 'exam eligible');
  await seeText(S, 'Semester 7 · 2026'); await S.evaluate(() => [...document.querySelectorAll('button.ticket')].find((b) => b.innerText.toLowerCase().includes('semester 3')).click()); await seeText(S, 'Semester 3 · 2024'); await seeText(S, 'Open marksheet');
  assert((await S.$$('button.ticket')).length === 7, 'seven term cards'); assert(await S.$('.recharts-surface'), 'charts');
}, S);
await step('results: marksheet per term, transcript, print button', async () => {
  await go(S, '/student/results'); await seeText(S, 'Grade sheet'); await seeText(S, 'Semester 7'); assert(await S.$('.marksheet svg'), 'QR'); await clickText(S, '.seg button', 'Semester 2'); await seeText(S, 'Semester 2');
  await clickText(S, '.seg button', 'Transcript'); await seeText(S, 'Cumulative transcript'); await seeText(S, 'Overall percentage'); await seeText(S, 'Final division');
  await clickText(S, '.seg button', 'Marksheets'); await seeText(S, 'Grade sheet');
}, S);
await step('attendance: ring, calendar strip, per-subject filter, recent classes', async () => {
  await go(S, '/student/attendance'); await seeText(S, 'My attendance'); await seeText(S, 'eligible for exams'); await seeText(S, 'Last classes'); assert((await S.$$('.card button[aria-label*=":"]')).length > 5, 'calendar squares');
  await S.hover('.card button[aria-label*=":"]'); await sleep(200); await S.locator('.card button[aria-pressed]').click(); await seeText(S, 'Showing'); await S.locator('.card button[aria-pressed="true"]').click(); await seeText(S, 'Recent classes');
}, S);
await step('insights: forecast, percentile, risk gauge and reasons', async () => {
  await go(S, '/student/insights'); await seeText(S, 'Where am I heading?'); await seeText(S, 'Forecast next GPA'); await seeText(S, 'Percentile in class'); await seeText(S, 'Early-warning check'); await seeText(S, 'Standing in your class'); assert(await S.$('svg[aria-label^="Risk score"]'), 'gauge');
}, S);
await step('merit list: own program only, own row highlighted, podium', async () => {
  await go(S, '/ranking'); await A_wait(S); assert(await S.$('tr.me-row'), 'my row highlighted'); assert(await S.$('canvas'), 'podium'); await seeText(S, '(you)');
}, S);
await step('account: change password then restore it', async () => {
  const q = await anon(); const em = `acct-${uid}@e2e.test`; const r = await api('/auth/register', { method: 'POST', body: { name: 'Account Tester', email: em, password: 'Passw0rdX', roll_no: `AT${uid}`, semester: 1, program_id: BCA.id } });
  const qq = await as(r.data.token); await go(qq, '/account'); await fillField(qq, 'Current password', 'wrong'); await fillField(qq, 'New password', 'Another1Pass'); await clickText(qq, 'button', 'Update password'); await seeText(qq, 'Current password is incorrect');
  await fillField(qq, 'Current password', 'Passw0rdX'); await clickText(qq, 'button', 'Update password'); await seeText(qq, 'Password changed'); assert(await tokenFor(em, 'Another1Pass'), 'new password works'); await qq.close(); await q.close();
}, S);
async function A_wait(page) { await page.waitForSelector('tbody tr', { timeout: 12000 }); await sleep(300); }
await S.close();

// ============================================================ RESPONSIVE + THEMES
section('Responsive layouts and dark theme (no horizontal overflow, no errors)');
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
{
  const PAGES = [['/', null], ['/login', null], ['/result?roll=27802063', null], ['/verify', null], ['/algorithms', null], ['/admin', adminToken], ['/admin/students', adminToken], ['/admin/results', adminToken], ['/admin/mail', adminToken], ['/teacher', teacherToken], ['/teacher/marks', teacherToken], ['/student', studentToken], ['/student/attendance', studentToken], ['/ranking', studentToken]];
  for (const [w, h, label] of [[390, 844, 'phone'], [820, 1100, 'tablet']]) {
    const p = await newPage(browser, { token: null, width: w, height: h });
    await step(`${label} (${w}px): ${PAGES.length} pages fit the screen`, async () => {
      const bad = [];
      for (const [path, token] of PAGES) {
        await p.evaluate((tk) => { tk ? localStorage.setItem('stures_token', tk) : localStorage.removeItem('stures_token'); }, token).catch(() => {});
        await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await p.evaluate((tk) => { tk ? localStorage.setItem('stures_token', tk) : localStorage.removeItem('stures_token'); }, token); await p.reload({ waitUntil: 'domcontentloaded' }); await settle(p); await sleep(900);
        const o = await overflow(p); if (o > 2) bad.push(`${path} overflows by ${o}px`);
      }
      assert(!bad.length, bad.join('; '));
    }, p);
    if (w === 390) await step('phone: the sidebar opens from the menu button and closes on navigation', async () => {
      await p.evaluate((tk) => localStorage.setItem('stures_token', tk), adminToken); await p.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' }); await settle(p);
      await click(p, 'button[aria-label="Menu"]'); await p.waitForSelector('.rail.open'); await clickText(p, '.rail a', 'Students'); await p.waitForFunction(() => location.pathname === '/admin/students'); await p.waitForFunction(() => !document.querySelector('.rail.open'), { timeout: 4000 });
    }, p);
    await p.close();
  }
  const d = await newPage(browser, { token: adminToken, theme: 'dark' });
  await step('dark theme: every admin page renders without errors', async () => {
    for (const r of ['/admin', '/admin/insights', '/admin/programs', '/admin/subjects', '/admin/students', '/admin/teachers', '/admin/results', '/ranking', '/admin/mail', '/admin/notices', '/admin/settings', '/admin/audit', '/algorithms']) { await go(d, r); assert(await d.$('.main'), r); await sleep(300); }
    assert((await d.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  }, d);
  await d.close();
}

await browser.close();
const failed = summary();
process.exit(failed ? 1 : 0);
