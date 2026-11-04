// Generates every figure as SVG, then renders PNGs with headless Edge (puppeteer-core from ../../e2e).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from '../../e2e/lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'figures');
fs.mkdirSync(OUT, { recursive: true });

const INK = '#1a2238', NAVY = '#1F3D78', SOFT = '#EEF2FA', LINE = '#44506a', BRASS = '#B7791F', GREEN = '#E8F3EC';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Svg {
  constructor(w, h) { this.w = w; this.h = h; this.parts = []; }
  add(s) { this.parts.push(s); return this; }
  text(x, y, t, o = {}) {
    const lines = Array.isArray(t) ? t : String(t).split('\n');
    const size = o.size || 13; const lh = size * 1.25;
    const y0 = y - ((lines.length - 1) * lh) / 2;
    const tspans = lines.map((l, i) => `<tspan x="${x}" y="${y0 + i * lh}">${esc(l)}</tspan>`).join('');
    return this.add(`<text x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" font-family="Times New Roman, serif" font-size="${size}" fill="${o.fill || INK}" font-weight="${o.bold ? 700 : 400}" font-style="${o.italic ? 'italic' : 'normal'}">${tspans}</text>`);
  }
  box(x, y, w, h, t, o = {}) {
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 6}" fill="${o.fill || SOFT}" stroke="${o.stroke || NAVY}" stroke-width="${o.sw || 1.5}" ${o.dash ? 'stroke-dasharray="6 4"' : ''}/>`);
    if (t) this.text(x + w / 2, y + h / 2, t, { size: o.size, bold: o.bold, fill: o.tfill });
    return this;
  }
  ellipse(cx, cy, rx, ry, t, o = {}) {
    this.add(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${o.fill || '#fff'}" stroke="${o.stroke || NAVY}" stroke-width="1.5"/>`);
    return this.text(cx, cy, t, { size: o.size || 12 });
  }
  line(x1, y1, x2, y2, o = {}) {
    return this.add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || LINE}" stroke-width="${o.sw || 1.4}" ${o.dash ? 'stroke-dasharray="6 4"' : ''} ${o.arrow ? 'marker-end="url(#arr)"' : ''}/>`);
  }
  poly(points, o = {}) {
    return this.add(`<polyline points="${points.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${o.stroke || LINE}" stroke-width="${o.sw || 1.4}" ${o.dash ? 'stroke-dasharray="6 4"' : ''} ${o.arrow ? 'marker-end="url(#arr)"' : ''}/>`);
  }
  actor(x, y, name) {
    this.add(`<g stroke="${INK}" stroke-width="1.6" fill="none"><circle cx="${x}" cy="${y}" r="9"/><line x1="${x}" y1="${y + 9}" x2="${x}" y2="${y + 34}"/><line x1="${x - 16}" y1="${y + 18}" x2="${x + 16}" y2="${y + 18}"/><line x1="${x}" y1="${y + 34}" x2="${x - 13}" y2="${y + 54}"/><line x1="${x}" y1="${y + 34}" x2="${x + 13}" y2="${y + 54}"/></g>`);
    return this.text(x, y + 68, name, { size: 13, bold: true });
  }
  diamond(cx, cy, w, h, t) {
    this.add(`<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}" fill="#fff" stroke="${NAVY}" stroke-width="1.5"/>`);
    return this.text(cx, cy, t, { size: 12 });
  }
  toString() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><defs><marker id="arr" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="${LINE}"/></marker></defs><rect width="100%" height="100%" fill="#fff"/>${this.parts.join('')}</svg>`;
  }
}

const figs = {};

// ---------- 1. Architecture ----------
{
  const s = new Svg(900, 520);
  s.box(30, 20, 840, 120, '', { fill: '#fafbfe', dash: true });
  s.text(110, 38, 'Presentation tier (browser)', { size: 13, bold: true, anchor: 'start' }); s.text(60, 38, '', {});
  ['Public pages\n(result search, verify,\nGPA checker)', 'Admin portal', 'Teacher portal', 'Student portal'].forEach((t, i) => s.box(60 + i * 205, 60, 180, 65, t, { size: 12 }));
  s.text(450, 155, 'React 18, Vite, Framer Motion, Recharts, three.js, qrcode.react', { size: 12, italic: true });
  s.box(30, 190, 840, 150, '', { fill: '#fafbfe', dash: true });
  s.text(110, 208, 'Application tier (Node.js and Express REST API)', { size: 13, bold: true, anchor: 'start' });
  ['Auth and RBAC\n(JWT, bcrypt)', 'Admin routes', 'Teacher routes', 'Classroom routes', 'Results routes'].forEach((t, i) => s.box(50 + i * 166, 228, 148, 55, t, { size: 12 }));
  ['Grading and attempts', 'Ranking and algorithms', 'Insights and risk', 'Mail queue (Nodemailer)'].forEach((t, i) => s.box(60 + i * 205, 296, 180, 36, t, { size: 12, fill: GREEN, stroke: '#2f7a4f' }));
  s.box(30, 385, 540, 110, '', { fill: '#fafbfe', dash: true });
  s.text(110, 403, 'Data tier', { size: 13, bold: true, anchor: 'start' });
  s.box(70, 425, 460, 55, 'MySQL 8.4 database (16 tables, mysql2 pool and transactions)', { size: 13 });
  s.box(620, 395, 250, 100, 'Gmail SMTP\n(app password)', { size: 13, fill: '#FFF6E5', stroke: BRASS });
  s.line(760, 142, 760, 188, { arrow: true }); s.line(780, 188, 780, 142, { arrow: true });
  s.text(742, 165, 'HTTPS / JSON (JWT)', { size: 11, anchor: 'end' });
  s.line(300, 342, 300, 383, { arrow: true }); s.text(350, 362, 'SQL', { size: 11 });
  s.line(560, 335, 700, 393, { arrow: true }); s.text(660, 352, 'SMTP', { size: 11 });
  figs.architecture = s;
}

// ---------- 2. Use case ----------
{
  const s = new Svg(980, 640);
  s.box(230, 10, 540, 615, '', { fill: '#fbfcff', r: 4 });
  s.text(500, 30, 'Anka Result and Class Management System', { size: 14, bold: true });
  s.actor(70, 90, 'Public visitor'); s.actor(70, 330, 'Student'); s.actor(910, 150, 'Teacher'); s.actor(910, 420, 'Administrator');
  const pub = [[420, 70, 'Search result by symbol no.'], [420, 118, 'Verify marksheet (QR / code)'], [420, 166, 'Personal GPA checker']];
  const stu = [[420, 250, 'View marksheet and transcript'], [420, 298, 'View attendance'], [420, 346, 'View insights and risk'], [420, 394, 'View timetable and assignments']];
  const tea = [[610, 80, 'Enter marks (CSV import)'], [610, 128, 'Enter back paper marks'], [610, 176, 'Take attendance'], [610, 224, 'Log class and assignments']];
  const adm = [[610, 300, 'Manage programs and subjects'], [610, 348, 'Manage students and teachers'], [610, 396, 'Calculate and publish results'], [610, 444, 'Promote students'], [610, 492, 'Mail center and notices'], [610, 540, 'Branding and audit log']];
  [...pub, ...stu, ...tea, ...adm].forEach(([x, y, t]) => s.ellipse(x, y, 92, 21, t, { size: 11 }));
  pub.forEach(([x, y]) => s.line(100, 110, x - 92, y));
  stu.forEach(([x, y]) => s.line(100, 365, x - 92, y));
  tea.forEach(([x, y]) => s.line(880, 190, x + 92, y));
  adm.slice(0, 6).forEach(([x, y]) => s.line(880, 460, x + 92, y));
  s.text(500, 600, 'All signed-in users can also sign in, reset a password, change it, and open the merit list.', { size: 11.5, italic: true });
  figs.usecase = s;
}

// ---------- 3. ER diagram ----------
{
  const s = new Svg(1000, 760);
  const ent = (x, y, name, cols, w = 170) => {
    const h = 26 + cols.length * 17;
    s.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${NAVY}" stroke-width="1.5"/>`);
    s.add(`<rect x="${x}" y="${y}" width="${w}" height="24" fill="${NAVY}"/>`);
    s.text(x + w / 2, y + 12, name, { size: 12, bold: true, fill: '#fff' });
    cols.forEach((c, i) => s.text(x + 8, y + 36 + i * 17, c, { size: 10.5, anchor: 'start' }));
    return { x, y, w, h };
  };
  const programs = ent(60, 20, 'programs', ['PK id', 'code, name, level', 'grading_scheme', 'term_label, term_count', 'terms_per_year', 'pass_percent', 'attendance_required']);
  const users = ent(420, 20, 'users', ['PK id', 'name, email (unique)', 'password (bcrypt)', 'role', 'status', 'reset_token_hash']);
  const teachers = ent(780, 20, 'teachers', ['PK id', 'FK user_id', 'teacher_name', 'department', 'phone']);
  const students = ent(60, 230, 'students', ['PK id', 'FK user_id, program_id', 'roll_no (unique)', 'student_name', 'semester, batch', 'guardian_email', 'status']);
  const subjects = ent(420, 230, 'subjects', ['PK id', 'FK program_id, teacher_id', 'code, name', 'semester, credit', 'internal_full', 'external_full']);
  const marks = ent(240, 440, 'marks', ['PK id', 'FK student_id, subject_id', 'exam_year', 'attempt (1 = regular)', 'internal_marks', 'external_marks'], 190);
  const results = ent(520, 440, 'results', ['PK id', 'FK student_id', 'semester, exam_year', 'gpa, grade, division', 'status, class_rank', 'backpapers, published', 'verify_code (unique)'], 190);
  const attendance = ent(60, 440, 'attendance', ['PK id', 'FK student_id, subject_id', 'att_date', 'status'], 150);
  ent(780, 230, 'timetable', ['PK id', 'FK subject_id', 'weekday', 'start_time, end_time', 'room'], 170);
  ent(780, 360, 'class_logs', ['PK id', 'FK subject_id', 'log_date, topic', 'notes'], 170);
  ent(780, 470, 'assignments', ['PK id', 'FK subject_id', 'title, due_date', 'max_marks'], 170);
  ent(780, 580, 'assignment_status', ['PK id', 'FK assignment_id', 'FK student_id', 'status, marks'], 170);
  ent(60, 610, 'email_logs', ['PK id, to_email', 'subject, type', 'status, attempts'], 150);
  ent(260, 640, 'notices', ['PK id', 'title, body, audience'], 150);
  ent(450, 640, 'audit_logs', ['PK id, user_id', 'action, detail'], 150);
  ent(640, 640, 'settings', ['PK key', 'value'], 110);
  const rel = (pts, lab, at) => { s.poly(pts); if (lab) s.text(at[0], at[1], lab, { size: 10, italic: true }); };
  rel([[145, 165], [145, 230]], '1..*', [165, 198]);
  rel([[230, 100], [330, 100], [330, 200], [480, 200], [480, 230]], '1..*', [455, 190]);
  rel([[420, 150], [300, 150], [300, 300], [230, 300]], '1..1', [310, 172]);
  rel([[780, 90], [590, 90]], '1..1', [685, 78]);
  rel([[860, 131], [860, 190], [560, 190], [560, 230]], '1..*', [840, 180]);
  rel([[200, 350], [200, 395], [300, 395], [300, 440]], '1..*', [215, 385]);
  rel([[100, 350], [100, 440]], '1..*', [118, 400]);
  rel([[230, 330], [390, 330], [390, 415], [600, 415], [600, 440]], '1..*', [560, 405]);
  rel([[500, 340], [500, 380], [380, 380], [380, 440]], '1..*', [470, 370]);
  rel([[590, 290], [780, 270]]); rel([[590, 310], [780, 400]]); rel([[590, 330], [780, 500]]);
  rel([[865, 560], [865, 580]]);
  s.text(500, 735, 'PK = primary key, FK = foreign key. Every child table references its parent with ON DELETE CASCADE (or SET NULL for audit and authorship).', { size: 11, italic: true });
  figs.er = s;
}

// ---------- 4. DFD level 0 ----------
{
  const s = new Svg(900, 420);
  s.ellipse(450, 210, 125, 62, 'Anka Result and\nClass Management\nSystem', { size: 14, fill: SOFT });
  const ext = [[90, 70, 'Administrator'], [90, 300, 'Teacher'], [810, 70, 'Student'], [810, 300, 'Guardian / Public']];
  ext.forEach(([x, y, t]) => s.box(x - 70, y - 25, 140, 50, t, { fill: '#fff', size: 13, bold: true }));
  s.poly([[160, 70], [330, 175]], { arrow: true }); s.text(230, 100, 'programs, subjects,\nstudents, publish', { size: 10.5, anchor: 'start' });
  s.poly([[160, 300], [335, 245]], { arrow: true }); s.text(165, 335, 'marks, attendance,\nclass log, assignments', { size: 10.5, anchor: 'start' });
  s.poly([[575, 175], [740, 75]], { arrow: true }); s.text(690, 135, 'results, insights,\ntimetable', { size: 10.5, anchor: 'start' });
  s.poly([[740, 70], [575, 185]], { arrow: true });
  s.poly([[575, 245], [740, 300]], { arrow: true }); s.text(655, 290, 'result email,\nverification', { size: 10.5, anchor: 'start' });
  s.poly([[740, 310], [570, 250]], { arrow: true }); s.text(765, 345, 'symbol no., code', { size: 10.5 });
  s.poly([[450, 272], [450, 390]], { arrow: true });
  s.box(380, 392, 140, 26, 'D: MySQL database', { fill: '#fff', r: 2 });
  figs.dfd0 = s;
}

// ---------- 5. DFD level 1 ----------
{
  const s = new Svg(1000, 560);
  const P = [[160, 90, '1.0\nManage academic\nsetup'], [500, 90, '2.0\nRecord marks and\nback papers'], [840, 90, '3.0\nCalculate\nresults'], [160, 330, '4.0\nPublish and\nnotify'], [500, 330, '5.0\nAnalyze and\nrank'], [840, 330, '6.0\nDaily class\nautomation']];
  P.forEach(([x, y, t]) => s.ellipse(x, y, 100, 50, t, { size: 12 }));
  const store = (x, y, t) => { s.line(x - 85, y - 14, x + 85, y - 14, { stroke: NAVY }); s.line(x - 85, y + 14, x + 85, y + 14, { stroke: NAVY }); s.text(x, y, t, { size: 12 }); };
  store(160, 215, 'D1 programs, subjects'); store(500, 215, 'D2 marks'); store(840, 215, 'D3 results'); store(160, 455, 'D4 email_logs'); store(500, 455, 'D5 attendance'); store(840, 455, 'D6 timetable, logs');
  s.box(10, 15, 100, 28, 'Administrator', { size: 11, fill: '#fff' }); s.box(390, 15, 100, 28, 'Teacher', { size: 11, fill: '#fff' }); s.box(885, 245, 105, 26, 'Student', { size: 11, fill: '#fff' }); s.box(10, 520, 110, 28, 'Guardian', { size: 11, fill: '#fff' });
  s.line(60, 43, 120, 62, { arrow: true }); s.line(440, 43, 470, 52, { arrow: true });
  [[160, 140, 160, 201], [500, 140, 500, 201], [840, 140, 840, 201]].forEach(([a, b, c, d]) => s.line(a, b, c, d, { arrow: true }));
  s.line(260, 100, 400, 100, { arrow: true }); s.line(600, 100, 740, 100, { arrow: true });
  s.line(772, 122, 572, 305, { arrow: true });
  s.line(140, 380, 140, 441, { arrow: true }); s.line(500, 380, 500, 441); s.line(840, 380, 840, 441, { arrow: true });
  s.line(740, 330, 600, 330, { arrow: true }); s.line(260, 330, 400, 330, { arrow: true });
  s.line(930, 271, 905, 298, { arrow: true }); s.line(70, 520, 110, 372, { arrow: true });
  s.text(330, 85, 'syllabus', { size: 10.5 }); s.text(670, 85, 'marks', { size: 10.5 }); s.text(962, 295, 'view', { size: 10.5 });
  figs.dfd1 = s;
}

// ---------- 6. Activity: calculate and publish ----------
{
  const s = new Svg(780, 700);
  const cx = 300;
  s.add(`<circle cx="${cx}" cy="28" r="10" fill="${INK}"/>`);
  const step = (y, t, w = 250) => { s.box(cx - w / 2, y, w, 46, t, { size: 12.5, r: 18 }); };
  const arrow = (y1, y2, x = cx) => s.line(x, y1, x, y2, { arrow: true });
  arrow(38, 70); step(70, 'Admin selects program, term, exam year');
  arrow(116, 148); step(148, 'Load cohort (students with a regular attempt\nin that exam year) and all later sittings');
  arrow(194, 226); step(226, 'Pick effective attempt per subject\n(first pass, otherwise latest)');
  arrow(272, 304); step(304, 'Compute subject percent, grade, points');
  arrow(350, 384); s.diamond(cx, 414, 220, 60, 'All subjects\npassed?');
  s.line(cx + 110, 414, 540, 414); s.text(580, 414, 'No', { size: 12 }); s.poly([[540, 414], [540, 470]], { arrow: true }); s.box(450, 470, 180, 46, 'Status = fail\n(reappear needed)', { size: 12, r: 18 });
  s.text(cx - 125, 400, 'Yes', { size: 12 }); arrow(444, 480); step(480, 'Status = pass, compute SGPA and division');
  s.poly([[540, 516], [540, 560], [cx, 560]]); arrow(526, 570); step(570, 'Rank cohort (merge sort, ties share rank)');
  s.line(cx, 616, cx, 646, { arrow: true }); s.box(cx - 125, 646, 250, 46, 'Save results; publish if admin chooses;\nqueue emails', { size: 12, r: 18 });
  figs.activity = s;
}

// ---------- 7. Sequence: publish results ----------
{
  const s = new Svg(980, 560);
  const lanes = [[90, 'Administrator'], [260, 'React client'], [430, 'Express API'], [600, 'MySQL'], [770, 'Mail worker'], [900, 'Gmail SMTP']];
  lanes.forEach(([x, t]) => { s.box(x - 62, 10, 124, 34, t, { size: 12, bold: true }); s.line(x, 44, x, 540, { dash: true, stroke: '#9aa5bd' }); });
  const msg = (y, from, to, t, o = {}) => { s.line(lanes[from][0], y, lanes[to][0] + (to > from ? -2 : 2), y, { arrow: true, dash: o.dash }); s.text((lanes[from][0] + lanes[to][0]) / 2, y - 12, t, { size: 11 }); };
  msg(80, 0, 1, 'Click Publish'); msg(115, 1, 2, 'POST /admin/results/publish'); msg(150, 2, 2 > 1 ? 3 : 3, 'verify admin role, begin transaction');
  msg(190, 2, 3, 'UPDATE results SET published = 1');
  msg(230, 3, 2, 'rows affected', { dash: true });
  msg(270, 2, 3, 'INSERT INTO email_logs (queued)'); msg(310, 2, 1, '200 {published, queued}', { dash: true }); msg(345, 1, 0, 'Toast: published, emails queued', { dash: true });
  msg(395, 4, 3, 'SELECT next queued job'); msg(435, 4, 5, 'send HTML message'); msg(475, 5, 4, '250 OK / error', { dash: true }); msg(515, 4, 3, 'status = sent (or retry, max 3)');
  figs.sequence = s;
}

// ---------- 8. Back paper flow ----------
{
  const s = new Svg(900, 330);
  const st = [[90, 'Regular sitting\n(attempt 1)'], [290, 'Failed subject\nbecomes a backlog'], [490, 'Back paper entered\n(attempt 2, 3 ...)'], [700, 'Effective attempt\nchosen']];
  st.forEach(([x, t]) => s.box(x - 80, 40, 160, 60, t, { size: 12.5, r: 26 }));
  [[170, 210], [370, 410], [570, 620]].forEach(([a, b]) => s.line(a, 70, b, 70, { arrow: true }));
  s.diamond(700, 190, 200, 70, 'Back paper\npassed?');
  s.line(700, 100, 700, 155, { arrow: true });
  s.box(530, 240, 190, 60, 'Cleared: semester GPA and\nCGPA recalculated', { fill: GREEN, stroke: '#2f7a4f', size: 12 });
  s.box(735, 240, 140, 60, 'Still a backlog:\nre-sit later', { fill: '#FBEAEA', stroke: '#B3392F', size: 12 });
  s.line(660, 215, 625, 240, { arrow: true }); s.text(620, 222, 'Yes', { size: 12 }); s.line(740, 215, 790, 240, { arrow: true }); s.text(782, 222, 'No', { size: 12 });
  s.text(300, 200, 'History of every sitting is kept.\nPublished results stay published.', { size: 12.5, italic: true });
  s.line(530, 270, 330, 245); s.poly([[790, 300], [790, 320], [300, 320], [300, 240]], { dash: true });
  figs.backpaper = s;
}

// ---------- 9. Class diagram ----------
{
  const s = new Svg(980, 520);
  const cls = (x, y, w, name, attrs, ops) => {
    const h = 24 + attrs.length * 15 + ops.length * 15 + 10;
    s.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${NAVY}" stroke-width="1.5"/>`);
    s.add(`<rect x="${x}" y="${y}" width="${w}" height="24" fill="${SOFT}" stroke="${NAVY}" stroke-width="1.5"/>`);
    s.text(x + w / 2, y + 12, name, { size: 12.5, bold: true });
    attrs.forEach((a, i) => s.text(x + 8, y + 36 + i * 15, a, { size: 10.5, anchor: 'start' }));
    const oy = y + 24 + attrs.length * 15 + 6; s.line(x, oy, x + w, oy, { stroke: NAVY, sw: 1 });
    ops.forEach((o, i) => s.text(x + 8, oy + 12 + i * 15, o, { size: 10.5, anchor: 'start' }));
    return { x, y, w, h };
  };
  cls(30, 20, 220, 'User', ['id, name, email', 'password, role, status'], ['signIn()', 'changePassword()', 'resetPassword()']);
  cls(30, 230, 220, 'Student', ['rollNo, program, semester', 'guardianEmail'], ['viewResults()', 'viewInsights()']);
  cls(310, 20, 220, 'Teacher', ['department'], ['enterMarks()', 'enterBackPapers()', 'takeAttendance()', 'logClass()']);
  cls(310, 230, 220, 'Subject', ['code, credit, internalFull', 'externalFull, semester'], ['isPassed(marks)']);
  cls(590, 20, 220, 'Program', ['gradingScheme, passPercent', 'termLabel, termCount'], ['bandFor(percent)']);
  cls(590, 230, 220, 'Marks', ['internal, external', 'examYear, attempt'], ['percent()']);
  cls(30, 400, 240, 'ResultService', [], ['calculateResults()', 'setPublished()', 'marksheet()', 'transcript()']);
  cls(330, 400, 240, 'GradingEngine', [], ['evaluateSubject()', 'computeSemester()', 'cgpa()', 'pickEffective()']);
  cls(630, 400, 240, 'MailService', ['queue: email_logs'], ['enqueue()', 'processQueue()', 'isReserved()']);
  cls(840, 230, 120, 'Result', ['gpa, grade', 'status, rank'], []);
  s.line(140, 129, 140, 230); s.text(160, 180, '1..1', { size: 10 });
  s.line(420, 129, 420, 230); s.text(440, 180, '1..*', { size: 10 });
  s.line(250, 290, 310, 290); s.text(280, 278, '*..*', { size: 10 });
  s.line(530, 290, 590, 290); s.text(560, 278, '1..*', { size: 10 });
  s.poly([[590, 70], [560, 70], [560, 250], [530, 250]]); s.text(578, 160, '1..*', { size: 10 });
  s.line(810, 290, 840, 290);
  s.line(150, 400, 150, 326, { dash: true, arrow: true });
  s.line(330, 440, 270, 440, { dash: true, arrow: true });
  s.poly([[150, 400], [150, 385], [750, 385], [750, 400]], { dash: true, arrow: true });
  figs.classdiagram = s;
}

// ---------- 10. Gantt ----------
{
  const tasks = [['Requirement study and proposal', 0, 2], ['System analysis and feasibility', 1, 3], ['Database and API design', 2, 5], ['Grading, ranking and algorithms', 4, 8], ['Frontend design system and pages', 5, 12], ['Email service', 8, 10], ['Back papers and daily classes', 10, 14], ['Testing and bug fixing', 11, 16], ['Documentation and defense', 13, 17]];
  const s = new Svg(980, 420);
  const x0 = 290, wk = 36;
  for (let w = 0; w < 17; w++) { s.text(x0 + w * wk + wk / 2, 28, `W${w + 1}`, { size: 10.5 }); s.line(x0 + w * wk, 40, x0 + w * wk, 40 + tasks.length * 36, { stroke: '#dfe4ee', sw: 1 }); }
  s.line(x0 + 17 * wk, 40, x0 + 17 * wk, 40 + tasks.length * 36, { stroke: '#dfe4ee', sw: 1 });
  tasks.forEach(([t, a, b], i) => {
    const y = 48 + i * 36;
    s.text(20, y + 14, t, { size: 12, anchor: 'start' });
    s.add(`<rect x="${x0 + a * wk}" y="${y}" width="${(b - a) * wk}" height="22" rx="4" fill="${NAVY}"/>`);
  });
  s.text(490, 400, 'Weeks from project start (17-week schedule)', { size: 11.5, italic: true });
  figs.gantt = s;
}

for (const [name, s] of Object.entries(figs)) fs.writeFileSync(path.join(OUT, `${name}.svg`), s.toString());
const browser = await launch();
for (const [name, s] of Object.entries(figs)) {
  const p = await browser.newPage();
  await p.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 2 });
  await p.goto(pathToFileURL(path.join(OUT, `${name}.svg`)).href);
  await p.screenshot({ path: path.join(OUT, `${name}.png`) });
  await p.close();
}
await browser.close();
console.log('figures:', Object.keys(figs).join(', '));
