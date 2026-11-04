import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Builder, assemble, save, Paragraph, TextRun, AlignmentType, runs, FONT } from './doclib.mjs';
import ch12 from './ch1_2.mjs'; import ch3 from './ch3.mjs'; import ch4 from './ch4.mjs'; import ch56 from './ch5_6.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)); const DOC = path.join(here, '..');
const F = (n) => path.join(DOC, 'figures', `${n}.png`); const S = (n) => path.join(DOC, 'screens', `${n}.png`);
const OUT = path.join(DOC, 'Anka_Project_Report.docx');
const PAGES = path.join(here, 'pages.json');
const pages = fs.existsSync(PAGES) ? JSON.parse(fs.readFileSync(PAGES, 'utf8')) : {};

const title = (t, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, before: o.before ?? 0, after: o.after ?? 120 }, children: runs(t, { size: o.size ?? 24, bold: o.bold }) });

// ---------------------------------------------------------------- title page (section 1, no number)
const titleSection = [
  title('TRIBHUVAN UNIVERSITY', { size: 32, bold: true, before: 120 }),
  title('Faculty of Humanities and Social Sciences', { size: 26, bold: true }),
  title('Pashupati Multiple Campus', { size: 26, bold: true, after: 360 }),
  title('A Project Report on', { size: 26, before: 240, after: 160 }),
  title('ANKA: STUDENT RESULT ANALYSIS AND RANKING SYSTEM', { size: 36, bold: true, after: 300 }),
  title('Submitted to', { size: 24, before: 120 }),
  title('Department of Computer Application', { size: 26, bold: true }),
  title('Pashupati Multiple Campus', { size: 24, after: 240 }),
  title('In partial fulfillment of the requirements for the degree of', { size: 24 }),
  title('Bachelor of Computer Applications (BCA)', { size: 26, bold: true }),
  title('Project III (CACS452), Eighth Semester', { size: 24, after: 480 }),
  title('Submitted by', { size: 24, bold: true }),
  title('Niranjan Katwal', { size: 28, bold: true }),
  title('TU Symbol No.: 27802063', { size: 24 }),
  title('TU Registration No.: 6-2-278-18-2022', { size: 24, after: 360 }),
  title('Project Supervisor', { size: 24, bold: true }),
  title('[[Name and designation of the supervisor]]', { size: 24, after: 360 }),
  title('[[Month and year of submission]]', { size: 24 }),
];


function frontPages(b, probe) {

b.unnumbered('Supervisor\'s Recommendation', { front: true, pageBreak: false });
b.p('I hereby recommend that this project report, prepared under my supervision by **Niranjan Katwal** (TU Symbol No. 27802063, Registration No. 6-2-278-18-2022) and entitled "**Anka: Student Result Analysis and Ranking System**", be accepted as partial fulfillment of the requirements for the degree of Bachelor of Computer Applications. In my opinion, this report is satisfactory for submission to the evaluation committee.');
b.blank(3);
b.p('[[Signature]]');
b.p('[[Name of the supervisor]]');
b.p('[[Designation]]');
b.p('Pashupati Multiple Campus');
b.p('Date: [[dd/mm/yyyy]]');

b.unnumbered('Certificate of Approval', { front: true });
b.p('This is to certify that the project report entitled "**Anka: Student Result Analysis and Ranking System**" submitted by **Niranjan Katwal** in partial fulfillment of the requirements for the degree of Bachelor of Computer Applications has been examined and approved by the evaluation committee.');
b.blank(1);
['Supervisor', 'Internal Examiner', 'External Examiner', 'Head of Department / Program Coordinator', 'Campus Chief'].forEach((r) => {
  b.p(`[[Signature]]  ${r}: [[Name]]`);
});
b.p('Date: [[dd/mm/yyyy]]');

b.unnumbered('Acknowledgement', { front: true });
b.p('I would like to express my sincere gratitude to my project supervisor, [[name of the supervisor]], for the guidance, patient review and constructive suggestions that shaped this project. I am thankful to the Head of Department and all the teachers of the Department of Computer Application at Pashupati Multiple Campus for the knowledge they shared during the four years of the BCA program.');
b.p('I thank the Tribhuvan University for the project framework that gave this work a clear direction, and my classmates and friends who tested early versions and gave honest feedback. Finally, I am grateful to my family for their constant support and encouragement.');
b.p('Any remaining mistakes are my own, and I welcome suggestions for improvement.');
b.blank(1);
b.p('Niranjan Katwal');

b.unnumbered('Abstract', { front: true });
b.p('Educational institutions in Nepal still prepare results from paper registers and spreadsheets. Marks are copied several times, grade points are calculated by hand, back paper results are hard to track, printed marksheets cannot be verified, and weak students are noticed only after the final examination. This project presents **Anka**, a web based Student Result Analysis and Ranking System that removes these problems for institutions of any level.');
b.p('Anka stores programs, subjects, marks and attendance in a MySQL database and exposes them through a Node.js and Express REST API and a React client. A configurable grading engine supports TU semester GPA, NEB grade points and percentage divisions with credit-weighted SGPA and CGPA. A back paper (re-sit) is stored as a separate sitting so that a cleared failure updates the semester result while the full history is kept. Students are ranked with a merge sort that handles ties, and the system provides analytics based on a binary heap, descriptive statistics, linear regression, Pearson correlation and k-means clustering, all implemented from scratch. An explainable early-warning score identifies students at risk. Marksheets carry a QR code and a ten-character code that anyone can verify. Result, approval, reset, notice and risk emails are sent through a queue with retries. A daily class module provides a timetable with clash detection, a class diary and assignment tracking. The product is unbranded by default, so any school, college or university can use it.');
b.p('The system was tested with 18 unit tests, 58 API flow checks, 43 smoke checks, 32 classroom checks and a browser end-to-end suite that drives the real pages. The results show that the objectives were met. The grade table and back paper rules follow the commonly published TU scheme and are editable, because they could not be verified against the official regulation.');
b.p('**Keywords:** result processing, GPA, back paper, ranking, merge sort, k-means, early warning, REST API, React, MySQL, Nepal');


  b.unnumbered('Table of Contents', { front: true });
  b.list([...FRONT_HEADS.map((t) => [t, 1]), ...probe.headings.filter((h) => h.level <= 2).map((h) => [h.text, h.level])]);
  const abbr = [
  ['API', 'Application Programming Interface'], ['BCA', 'Bachelor of Computer Applications'], ['CGPA', 'Cumulative Grade Point Average'], ['CORS', 'Cross-Origin Resource Sharing'],
  ['CRUD', 'Create, Read, Update, Delete'], ['CSV', 'Comma-Separated Values'], ['DFD', 'Data Flow Diagram'], ['ER', 'Entity Relationship'], ['GPA', 'Grade Point Average'],
  ['HTML', 'HyperText Markup Language'], ['HTTP', 'HyperText Transfer Protocol'], ['JSON', 'JavaScript Object Notation'], ['JWT', 'JSON Web Token'], ['NEB', 'Nepal Examination Board'],
  ['RBAC', 'Role Based Access Control'], ['REST', 'Representational State Transfer'], ['SGPA', 'Semester Grade Point Average'], ['SMTP', 'Simple Mail Transfer Protocol'],
  ['SQL', 'Structured Query Language'], ['TU', 'Tribhuvan University'], ['UI', 'User Interface'], ['UML', 'Unified Modeling Language'], ['QR', 'Quick Response (code)'],
];

  b.unnumbered('List of Abbreviations', { front: true });
  abbr.forEach(([a, f]) => b.push(new Paragraph({ spacing: { line: 300, after: 40 }, children: [new TextRun({ text: a, font: FONT, bold: true, size: 24 }), new TextRun({ text: '	' + f, font: FONT, size: 24 })], tabStops: [{ type: 'left', position: 1600 }] })));
  b.unnumbered('List of Figures', { front: true });
  probe.figures.forEach((l) => b.push(b.tocEntry(l, 2)));
  b.unnumbered('List of Tables', { front: true });
  probe.tables.forEach((l) => b.push(b.tocEntry(l, 2)));
}
const FRONT_HEADS = ["SUPERVISOR'S RECOMMENDATION", 'CERTIFICATE OF APPROVAL', 'ACKNOWLEDGEMENT', 'ABSTRACT', 'TABLE OF CONTENTS', 'LIST OF ABBREVIATIONS', 'LIST OF FIGURES', 'LIST OF TABLES'];

function buildBody(bb) {
  bb.startMain();
  ch12(bb, F); ch3(bb, F); ch4(bb, F); ch56(bb, F);
  // ---- references
  bb.unnumbered('References');
  const refs = [
    'C. Romero and S. Ventura, "Educational data mining: A review of the state of the art," *IEEE Trans. Syst., Man, Cybern. C, Appl. Rev.*, vol. 40, no. 6, pp. 601-618, Nov. 2010.',
    'T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, *Introduction to Algorithms*, 3rd ed. Cambridge, MA, USA: MIT Press, 2009.',
    'J. MacQueen, "Some methods for classification and analysis of multivariate observations," in *Proc. 5th Berkeley Symp. Math. Statist. Probab.*, vol. 1, 1967, pp. 281-297.',
    'S. P. Lloyd, "Least squares quantization in PCM," *IEEE Trans. Inf. Theory*, vol. 28, no. 2, pp. 129-137, Mar. 1982.',
    'K. Pearson, "Notes on regression and inheritance in the case of two parents," *Proc. R. Soc. Lond.*, vol. 58, pp. 240-242, 1895.',
    'N. Provos and D. Mazieres, "A future-adaptable password scheme," in *Proc. USENIX Annu. Tech. Conf.*, 1999, pp. 81-91.',
    'M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, Internet Engineering Task Force, May 2015.',
    'J. Klensin, "Simple Mail Transfer Protocol," RFC 5321, Internet Engineering Task Force, Oct. 2008.',
    'R. T. Fielding, "Architectural styles and the design of network-based software architectures," Ph.D. dissertation, Univ. California, Irvine, CA, USA, 2000.',
    'I. Sommerville, *Software Engineering*, 10th ed. Harlow, U.K.: Pearson, 2016.',
    'R. S. Pressman and B. R. Maxim, *Software Engineering: A Practitioner\'s Approach*, 8th ed. New York, NY, USA: McGraw-Hill, 2015.',
    'Meta Platforms, Inc., "React documentation." [Online]. Available: https://react.dev. [Accessed: 2 Nov. 2026].',
    'OpenJS Foundation, "Express: Fast, unopinionated, minimalist web framework for Node.js." [Online]. Available: https://expressjs.com. [Accessed: 2 Nov. 2026].',
    'Oracle Corporation, "MySQL 8.4 Reference Manual." [Online]. Available: https://dev.mysql.com/doc/refman/8.4/en/. [Accessed: 2 Nov. 2026].',
    'Nodemailer, "Nodemailer: Send emails from Node.js." [Online]. Available: https://nodemailer.com. [Accessed: 2 Nov. 2026].',
    'World Wide Web Consortium, "Web Content Accessibility Guidelines (WCAG) 2.1." [Online]. Available: https://www.w3.org/TR/WCAG21/. [Accessed: 2 Nov. 2026].',
    'Tribhuvan University, Faculty of Humanities and Social Sciences, "CACS452 Project III, BCA eighth semester course outline." [Online]. Available: https://www.itcollegenepal.com/wp-content/uploads/2022/02/CACS452-BCA-VIII-SEM-Project-III.pdf. [Accessed: 2 Nov. 2026].',
    'Tribhuvan University, Office of the Dean, FOHSS, "BCA curriculum." [Online]. Available: https://tufohss.edu.np. [Accessed: 2 Nov. 2026].',
    'Nepal Examination Board, "Grading system for grades 11 and 12." [Online]. Available: https://neb.gov.np. [Accessed: 2 Nov. 2026].',
  ];
  refs.forEach((r, i) => bb.push(new Paragraph({ spacing: { line: 360, after: 100 }, alignment: AlignmentType.JUSTIFIED, indent: { left: 540, hanging: 540 }, children: runs(`[${i + 1}]\t${r}`) })));

  // ---- appendices
  bb.ch = 'A';
  bb.unnumbered('Appendix A: Screenshots');
  const shots = [['landing', 'Landing page'], ['gpa', 'Personal GPA checker with back papers'], ['verify', 'Marksheet verification result'], ['admin-dashboard', 'Administrator dashboard'], ['admin-programs', 'Programs with grading schemes'], ['admin-results', 'Results workflow'], ['admin-mail', 'Mail center'], ['teacher-marks', 'Marks entry grid'], ['teacher-backpapers', 'Back paper entry'], ['classes-timetable', 'Classes: weekly timetable'], ['student-results', 'Marksheet with QR code'], ['student-insights', 'Student insights and risk']];
  shots.forEach(([n, c]) => bb.fig(S(n), c, 4.3));
  bb.push(new Paragraph({ spacing: { after: 0 }, children: [] }));
  // email screenshot at 3.6in so it keeps its shape
  bb.fig(S('email-result'), 'Result email as rendered in a browser', 3.0);
  bb.unnumbered('Appendix B: Running the System');
  bb.numbered([
    'Install Node.js 20 or later. Run `setup-mysql.cmd` once to prepare the portable MySQL copy, then `start-mysql.cmd` to start it (port 3308).',
    'In `backend`, copy `.env.example` to `.env`, set `JWT_SECRET`, and optionally set `EMAIL_USER` and `EMAIL_APP_PASSWORD` for Gmail.',
    'Run `npm install` in `backend`, `frontend` and `e2e`, then `npm run db:setup` in `backend` to create the schema and demo data.',
    'Start the API with `node server.js` (port 5000) and the client with `npm run dev` in `frontend` (port 5191).',
    'Sign in with the demo accounts printed by the seed script (administrator, teacher and student).',
  ], 'num3');
  bb.p('The complete source code is available in the public repository https://github.com/itsniranjannn/StuResSystem.');
}


const probe = new Builder(pages); buildBody(probe);
const b = new Builder(pages); frontPages(b, probe); buildBody(b);
const doc = assemble(b, { titleSection });
await save(doc, OUT);
fs.writeFileSync(path.join(here, 'headings.json'), JSON.stringify({ headings: probe.headings, figures: probe.figures, tables: probe.tables, front: FRONT_HEADS }, null, 1));
console.log('written', OUT, 'headings', probe.headings.length, 'figures', probe.figures.length, 'tables', probe.tables.length);
