import pptxgen from 'pptxgenjs';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const DOC = path.join(here, '..');
const S = (n) => path.join(DOC, 'screens', `${n}.png`); const F = (n) => path.join(DOC, 'figures', `${n}.png`);
const size = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const NAVY = '1F3D78', INK = '1A2238', BRASS = 'B7791F', SOFT = 'EEF2FA', MUTE = '5B6A85', LINE = 'D5DBE8', WHITE = 'FFFFFF';
const HEAD = 'Georgia', BODY = 'Calibri';

const p = new pptxgen(); p.layout = 'LAYOUT_16x9'; p.title = 'Anka: Student Result Analysis and Ranking System'; p.author = 'Niranjan Katwal';
const W = 10, H = 5.625;

function frame(title, n, notes) {
  const s = p.addSlide(); s.background = { color: WHITE };
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: H, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText(title, { x: 0.55, y: 0.3, w: 8.9, h: 0.6, fontFace: HEAD, fontSize: 26, bold: true, color: INK, margin: 0 });
  s.addShape(p.ShapeType.line, { x: 0.55, y: 0.95, w: 1.1, h: 0, line: { color: BRASS, width: 2.25 } });
  s.addText('Anka: Student Result Analysis and Ranking System', { x: 0.55, y: 5.25, w: 6, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTE, margin: 0 });
  s.addText(String(n), { x: 9.0, y: 5.25, w: 0.5, h: 0.25, fontFace: BODY, fontSize: 9, color: MUTE, align: 'right', margin: 0 });
  if (notes) s.addNotes(notes);
  return s;
}
function bullets(s, items, o = {}) {
  s.addText(items.map((t) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: true, paraSpaceAfter: 7 } })), { x: o.x ?? 0.55, y: o.y ?? 1.2, w: o.w ?? 8.9, h: o.h ?? 3.8, fontFace: BODY, fontSize: o.size ?? 16, color: INK, valign: 'top', margin: 0 });
}
function img(s, f, x, y, maxW, maxH, o = {}) {
  const { w, h } = size(f); const r = Math.min(maxW / w, maxH / h); const iw = w * r, ih = h * r;
  s.addImage({ path: f, x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih, ...(o.border ? {} : {}) });
  if (o.border) s.addShape(p.ShapeType.rect, { x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih, fill: { type: 'none' }, line: { color: LINE, width: 0.75 } });
}

// 1. title
{
  const s = p.addSlide(); s.background = { color: NAVY };
  s.addShape(p.ShapeType.rect, { x: 0, y: 4.9, w: W, h: 0.06, fill: { color: BRASS }, line: { color: BRASS } });
  s.addText('PROJECT III (CACS452)  |  BCA EIGHTH SEMESTER', { x: 0.7, y: 0.8, w: 8.6, h: 0.3, fontFace: BODY, fontSize: 12, color: 'C9D3EA', charSpacing: 3, margin: 0 });
  s.addText('Anka', { x: 0.7, y: 1.4, w: 8.6, h: 1.0, fontFace: HEAD, fontSize: 60, bold: true, color: WHITE, margin: 0 });
  s.addText('Student Result Analysis and Ranking System', { x: 0.7, y: 2.45, w: 8.6, h: 0.6, fontFace: HEAD, fontSize: 26, color: WHITE, margin: 0 });
  s.addText('Results, back papers, ranking, insights and daily classes for institutions of any level', { x: 0.7, y: 3.1, w: 8.6, h: 0.4, fontFace: BODY, fontSize: 15, color: 'C9D3EA', margin: 0 });
  s.addText([{ text: 'Niranjan Katwal', options: { bold: true, breakLine: true } }, { text: 'TU Symbol No. 27802063  |  Regd. No. 6-2-278-18-2022', options: { breakLine: true } }, { text: 'Pashupati Multiple Campus, Tribhuvan University', options: {} }], { x: 0.7, y: 3.85, w: 8.6, h: 0.9, fontFace: BODY, fontSize: 14, color: WHITE, margin: 0 });
  s.addNotes('Introduce yourself and the project. Anka means number or mark. One sentence: it turns marks into trustworthy results for any institution.');
}
// 2. problem
{
  const s = frame('The problem', 2, 'Describe the manual chain: register, spreadsheet, notice board. Mention back papers and forged marksheets, which are the two points panelists relate to most.');
  bullets(s, [
    'Marks are copied by hand between registers and spreadsheets, so errors reach students.',
    'Back papers are hard to track and their effect on GPA and CGPA is unclear.',
    'Each program has different grading rules, but most tools allow only one.',
    'Printed marksheets cannot be verified.',
    'Weak students are noticed after the final exam, not before it.',
    'Class timetables, diaries and assignments live in notebooks and chat groups.',
    'Local software is often tied to one institution\'s name or rules.',
  ], { size: 17 });
}
// 3. objectives
{
  const s = frame('Objectives', 3, 'Read the objectives quickly. Each one maps to a module you will demonstrate.');
  const cols = [['Calculate', 'Configurable grading engine: TU GPA, NEB grade points, divisions; SGPA and CGPA'], ['Track', 'Back papers as separate sittings with full history'], ['Rank and analyze', 'Merge sort ranking, heap, statistics, regression, correlation, k-means'], ['Protect', 'Role based access, QR verified marksheets, explainable risk score'], ['Communicate', 'Email queue with retries; notices; audit log'], ['Run the class', 'Timetable, class diary, assignments; unbranded for any institution']];
  cols.forEach(([h, t], i) => {
    const x = 0.55 + (i % 3) * 3.0, y = 1.3 + Math.floor(i / 3) * 1.9;
    s.addShape(p.ShapeType.rect, { x, y, w: 2.8, h: 1.7, fill: { color: SOFT }, line: { color: LINE, width: 0.75 } });
    s.addText(h, { x: x + 0.15, y: y + 0.12, w: 2.5, h: 0.4, fontFace: HEAD, fontSize: 16, bold: true, color: NAVY, margin: 0 });
    s.addText(t, { x: x + 0.15, y: y + 0.55, w: 2.5, h: 1.05, fontFace: BODY, fontSize: 12.5, color: INK, valign: 'top', margin: 0 });
  });
}
// 4. architecture
{
  const s = frame('System architecture', 4, 'Three tiers. The mail worker reads a queue in the database so a slow mail server never blocks the administrator. The API is stateless, JWT on every request.');
  img(s, F('architecture'), 0.55, 1.15, 5.9, 3.9);
  bullets(s, ['React 18 client with a shared design system', 'Express REST API: 82 endpoints, 5 routers', 'MySQL 8.4: 16 tables, transactions, foreign keys', 'Gmail SMTP through a retrying queue', 'JWT sessions, bcrypt, role checks, rate limits'], { x: 6.6, y: 1.3, w: 3.0, size: 13 });
}
// 5. grading + back papers
{
  const s = frame('Grading engine and back papers', 5, 'Explain the effective attempt: first pass, otherwise latest. Then show the GPA checker for a student who passes a back paper.');
  img(s, F('backpaper'), 0.55, 1.15, 5.4, 2.0);
  bullets(s, ['SGPA = sum(point x credit) / sum(credit); CGPA over semesters', 'Pass needs the pass mark overall and in the external part', 'Grade lookup by binary search over editable bands', 'Back paper = new attempt row; effective attempt chosen; semester result recalculated; history kept'], { x: 0.55, y: 3.3, w: 5.4, h: 1.9, size: 12.5 });
  img(s, S('gpa'), 6.15, 1.15, 3.5, 3.9, { border: true });
}
// 6. algorithms
{
  const s = frame('Algorithms implemented from scratch', 6, 'All of these are in backend/utils with no libraries. The /algorithms page lets the panel run them live.');
  const rows = [['Algorithm', 'Used for', 'Cost'], ['Binary search', 'Grade band, percentile', 'O(log n)'], ['Merge sort + competition rank', 'Merit list, class rank with ties', 'O(n log n)'], ['Binary min-heap', 'Top performers (top-k)', 'O(n log k)'], ['Statistics, z-score', 'Mean, median, deviation, pass rate', 'O(n log n)'], ['Linear regression', 'GPA trend and forecast', 'O(n)'], ['Pearson correlation', 'Attendance vs GPA', 'O(n)'], ['K-means (farthest-first start)', 'Support groups', 'O(n k i)'], ['Weighted risk score', 'Explainable early warning', 'O(1)']];
  s.addTable(rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? WHITE : INK, fill: { color: i === 0 ? NAVY : i % 2 ? WHITE : SOFT }, fontFace: BODY, fontSize: 13 } }))), { x: 0.55, y: 1.2, w: 8.9, colW: [3.0, 4.0, 1.9], border: { type: 'solid', color: LINE, pt: 0.75 }, rowH: 0.4 });
}
// 7. screens
{
  const s = frame('The system at work', 7, 'Demo order: admin dashboard, teacher marks, student marksheet with QR. Switch to the live system here if time allows.');
  [['admin-dashboard', 'Administrator dashboard'], ['teacher-marks', 'Marks entry grid'], ['student-results', 'Marksheet with QR code']].forEach(([n, c], i) => {
    const x = 0.55 + i * 3.0; img(s, S(n), x, 1.2, 2.85, 2.9, { border: true }); s.addText(c, { x, y: 4.2, w: 2.85, h: 0.3, fontFace: BODY, fontSize: 12, color: MUTE, align: 'center', margin: 0 });
  });
  s.addText('Neutral navy design system, light and dark themes, command palette, responsive down to phone width.', { x: 0.55, y: 4.6, w: 8.9, h: 0.4, fontFace: BODY, fontSize: 13, color: INK, margin: 0 });
}
// 8. email + classes
{
  const s = frame('Email and daily classes', 8, 'Email is queued, retried up to three times and logged. Demo addresses are never delivered. Show the timetable clash message.');
  img(s, S('email-result'), 0.55, 1.15, 2.9, 3.9, { border: true });
  img(s, S('classes-timetable'), 3.6, 1.15, 3.2, 2.4, { border: true });
  bullets(s, ['Eight HTML templates in the web palette', 'Queue, 3 attempts, full log and preview', 'Timetable rejects teacher and class clashes', 'Class diary and assignment tracking'], { x: 7.0, y: 1.2, w: 2.7, size: 12.5 });
  s.addText('Result email as received (rendered)', { x: 0.55, y: 5.0, w: 2.9, h: 0.22, fontFace: BODY, fontSize: 9, color: MUTE, align: 'center', margin: 0 });
}
// 9. testing
{
  const s = frame('Testing and results', 9, 'Be honest about the browser suite: 56 of 58 on a clean run, slower machines time out. The real defects it found were fixed.');
  const stats = [['18', 'unit tests'], ['58', 'API flow checks'], ['43', 'smoke checks'], ['32', 'classroom checks']];
  stats.forEach(([n, t], i) => {
    const x = 0.55 + i * 2.25; s.addShape(p.ShapeType.rect, { x, y: 1.25, w: 2.05, h: 1.35, fill: { color: SOFT }, line: { color: LINE, width: 0.75 } });
    s.addText(n, { x, y: 1.3, w: 2.05, h: 0.8, fontFace: HEAD, fontSize: 38, bold: true, color: NAVY, align: 'center', margin: 0 }); s.addText(t, { x, y: 2.1, w: 2.05, h: 0.4, fontFace: BODY, fontSize: 13, color: MUTE, align: 'center', margin: 0 });
  });
  bullets(s, ['Browser end-to-end suite drives the real pages: 56 of 58 steps passed on the best clean run', 'It found real defects: command palette stuck open, two screens with a missing import', '59 endpoints x 4 roles permission matrix; email tested against a local SMTP server', 'Grade table and back paper rules are editable: to be confirmed against the official TU regulation'], { y: 2.9, h: 2.2, size: 14 });
}
// 10. conclusion
{
  const s = frame('Conclusion and future work', 10, 'Close with the main point: one platform, any institution. Then invite questions.');
  s.addText('Delivered', { x: 0.55, y: 1.2, w: 4.2, h: 0.35, fontFace: HEAD, fontSize: 17, bold: true, color: NAVY, margin: 0 });
  bullets(s, ['Configurable grading with back papers', 'Ranking, analytics, risk score', 'QR verified marksheets, email queue', 'Timetable, diary, assignments', 'Unbranded: any institution'], { x: 0.55, y: 1.6, w: 4.2, size: 14 });
  s.addText('Next', { x: 5.1, y: 1.2, w: 4.3, h: 0.35, fontFace: HEAD, fontSize: 17, bold: true, color: NAVY, margin: 0 });
  bullets(s, ['Confirm rules with the official TU regulation', 'Several institutions on one server', 'Mobile app and SMS', 'File upload for assignments', 'Signed PDF marksheets'], { x: 5.1, y: 1.6, w: 4.3, size: 14 });
  s.addShape(p.ShapeType.rect, { x: 0.55, y: 4.3, w: 8.9, h: 0.6, fill: { color: NAVY }, line: { color: NAVY } });
  s.addText('Thank you. Questions?   github.com/itsniranjannn/StuResSystem', { x: 0.55, y: 4.3, w: 8.9, h: 0.6, fontFace: BODY, fontSize: 16, color: WHITE, align: 'center', valign: 'middle', margin: 0 });
}
await p.writeFile({ fileName: path.join(DOC, 'Anka_Defense_Presentation.pptx') });
console.log('slides written');
