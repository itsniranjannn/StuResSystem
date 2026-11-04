export default function (b, F) {
  // ================================================================ CHAPTER 1
  b.chapter('Introduction');
  b.h2('1.1 Background');
  b.p('Every term, educational institutions in Nepal collect marks from many teachers, convert them into grades, work out each student\'s standing, and announce results. In most campuses and schools this chain is still handled with paper mark ledgers, separate spreadsheets for each subject, and a notice board. A teacher writes marks in a register, the examination office copies them into a spreadsheet, a clerk calculates grade points by hand or with fragile formulas, and the final list is printed. Each copy step is a chance for a typing error, and each error becomes visible only after students complain.');
  b.p('Tribhuvan University (TU) uses a semester system for its four-year Bachelor of Computer Applications (BCA) program. Every semester has a set of subjects with credit hours, and each subject is assessed through internal marks and an external (board) examination. A student who fails a subject does not repeat the whole semester. Instead the student sits a *back paper* (a re-sit) in a later examination, and when it is passed the earlier failure is cleared. The Nepal Examination Board (NEB) for grades 11 and 12 and school boards for lower grades use their own grade-point tables and pass rules. A single institution can therefore run several programs with different rules at the same time.');
  b.p('Anka (Nepali for "number" or "mark") is a web based Student Result Analysis and Ranking System built to remove this manual work. It stores syllabus, marks and attendance in one MySQL database, calculates semester GPA and cumulative GPA with a grading engine that can be configured for each program, ranks students with an algorithm implemented from scratch, warns about students at academic risk, sends result emails, and verifies printed marksheets with a QR code. The same platform also records the daily life of a class: the weekly timetable, what was taught in each class, and assignments with submission status.');

  b.h2('1.2 Problem Statement');
  b.p('The following problems were identified in the way results and classes are managed in many institutions:');
  b.bullets([
    '**Slow and error-prone results.** Marks are copied between registers and spreadsheets by hand. A wrong cell or a wrong formula changes a student\'s GPA, and the mistake is usually found late.',
    '**Back papers are hard to track.** A failed subject may be cleared one or two years later. Paper records make it difficult to know who still owes which subject, and a student who passes a back paper cannot easily see the effect on the semester GPA and the cumulative GPA.',
    '**Different programs need different rules.** A BCA program uses a 4.0 credit-weighted GPA, a higher secondary program uses grade points with a lower pass mark, and an annual bachelor program uses divisions. Most tools support exactly one of these.',
    '**Forged or disputed marksheets.** A printed marksheet carries no easy way for an employer or another institution to check that it is genuine.',
    '**Late warning for weak students.** Attendance shortage, falling GPA and failed subjects are noticed only after the final examination, when it is too late to help the student.',
    '**Poor communication.** Students and guardians learn about results from a notice board, and teachers learn about their new responsibilities by word of mouth.',
    '**Daily class management is scattered.** Timetables, class diaries and assignment lists live in notebooks and messaging groups, so there is no single record of what was taught and what is due.',
    '**Software is tied to one institution.** Many local solutions hard-code a name, a logo or one grading rule, so another institution cannot adopt them without changing the source code.',
  ]);
  b.p('The project therefore asks one practical question: can one low-cost web application let any educational institution record marks and classes once, calculate results correctly under its own rules, and give students, teachers and administrators timely and trustworthy information?');

  b.h2('1.3 Objectives');
  b.p('The main objective of the project is to design and implement a web based system that automates result processing, ranking, analysis and daily class management for educational institutions of any level. The specific objectives are:');
  b.numbered([
    'To implement a configurable grading engine with TU semester GPA, NEB grade points and percentage divisions, including credit-weighted SGPA and CGPA.',
    'To model back papers as separate sittings so that a cleared failure updates the semester result and the transcript while the history of every attempt is kept.',
    'To rank students with a merge sort based algorithm that handles ties fairly, and to provide analytical insights using statistics, regression, correlation and k-means clustering implemented from scratch.',
    'To warn about at-risk students with an explainable score built from attendance, failed subjects, GPA trend and internal marks.',
    'To provide secure role based access for administrators, teachers, students and the public, with verification of marksheets through a QR code.',
    'To send result, approval, password reset, notice and risk emails through a reliable queue with retries and a complete log.',
    'To support daily class automation through a timetable, class diary and assignment tracking.',
    'To keep the product neutral: no institution name, logo or affiliation is built in, while every institution can add its own details.',
  ], 'num2');

  b.h2('1.4 Scope and Limitations');
  b.h3('1.4.1 Scope');
  b.bullets([
    'Four kinds of users: the public (result search, verification, personal GPA checker), students, teachers and administrators.',
    'Programs of any level (school grades, higher secondary, bachelor, master) with their own term names, term counts, pass percentages and grading rules.',
    'Marks entry by typing or CSV import, attendance with an 80% eligibility rule, back paper entry, result calculation, publication, promotion to the next term, and a transcript with backlogs.',
    'Result analytics, merit lists, early-warning risk scores, cohort insights and an algorithm explorer page.',
    'A mail center with a queue, retries, previews and a log; notices; an audit log; optional institution branding.',
    'Daily class tools: weekly timetable with clash detection, class diary, assignments and submission tracking.',
  ]);
  b.h3('1.4.2 Limitations');
  b.bullets([
    'The system is a web application. A native mobile application is not part of this work, although every page works on a phone screen.',
    'The grade table and back-paper rules follow the commonly published TU scheme, but they could not be verified against the official regulation document. They are stored as editable data, so a campus can match its own rules.',
    'One installation serves one institution. Several institutions on one server (multi-tenancy) is future work.',
    'Assignment files are not uploaded; the system records the due date, status, marks and feedback only.',
    'Email delivery depends on a Gmail account with an app password configured by the administrator.',
    'Online payment, fee management and biometric attendance are outside the scope.',
  ]);

  b.h2('1.5 Development Methodology');
  b.p('The project followed an incremental and iterative process. A first working prototype was reviewed, and then each cycle added one slice of functionality, tested it, and fixed what the tests exposed. The work moved through requirement analysis, design, implementation and testing in repeated short cycles, which suits a single developer who must keep the whole system consistent.');
  b.table('Development phases and activities', ['Phase', 'Activities', 'Output'], [
    ['Requirement identification', 'Study of the result process, TU syllabus for Project III, grading rules and existing systems', 'Requirement list, use cases'],
    ['Analysis', 'Feasibility study, DFD, ER diagram, class diagram', 'Analysis models'],
    ['Design', 'Architecture, database schema, API design, interface design with a design system', 'Schema, route list, UI components'],
    ['Implementation', 'Node.js API, React client, grading and ranking algorithms, mail queue', 'Working system in Git repository'],
    ['Testing', 'Unit tests, API flow tests, smoke tests, browser end-to-end tests', 'Test suites and results'],
    ['Documentation', 'Proposal, report, presentation', 'This document'],
  ], [2.2, 4.4, 2.4]);
  b.p('Version control was done with Git and every logical step was committed to a public GitHub repository. The database is MySQL 8.4 and a portable copy is kept inside the project folder, so the system can be started on any Windows computer without installing a database server.');

  b.h2('1.6 Report Organization');
  b.p('This report has six chapters. Chapter 1 introduces the problem, objectives and scope. Chapter 2 reviews existing systems and the theory behind the algorithms used. Chapter 3 analyzes the system through requirements, feasibility, and process, data and object models. Chapter 4 describes the design: architecture, database, interface and algorithms. Chapter 5 explains the implementation and testing and reports the test results. Chapter 6 concludes the work and lists future recommendations. References and appendices with screenshots follow.');

  // ================================================================ CHAPTER 2
  b.chapter('Background Study and Literature Review');
  b.h2('2.1 Background Study');
  b.h3('2.1.1 The TU Semester System and GPA');
  b.p('Under the TU semester system a program is divided into terms, each with subjects that carry credit hours. Marks are given out of a full mark that is split into an internal part (assessment during the term) and an external part (the board examination). The percentage obtained in a subject is converted into a letter grade and a grade point on a 4.0 scale. The semester grade point average (SGPA) is the credit-weighted mean of the grade points of the subjects of a semester, and the cumulative grade point average (CGPA) is the credit-weighted mean over all semesters:');
  b.code('SGPA = sum(grade_point_i x credit_i) / sum(credit_i)\nCGPA = sum(SGPA_s x credits_s) / sum(credits_s)');
  b.p('A subject is passed only when the student obtains at least the pass percentage in the subject as a whole and in the external component. In Anka these values are properties of a program, so a 40% rule for BCA and a 35% rule for a higher secondary program can live side by side.');
  b.h3('2.1.2 Back Papers');
  b.p('A student who fails a subject may appear in a later examination for that subject only. The result of the new sitting replaces the failed one when it is a pass. The cohort to which the student belongs, the semester in which the subject was taught, and the earlier attempts must all remain intact. This is why Anka stores each sitting as its own row with an attempt number and chooses the *effective attempt* when a result is calculated: the first passing sitting if there is one, otherwise the most recent sitting.');
  b.h3('2.1.3 Education Systems of Other Levels');
  b.p('The NEB uses grade points from 1.6 (grade D) to 4.0 (grade A+) with a pass mark of 35% in each subject, and school levels often use divisions (Distinction, First, Second, Pass) derived from the total percentage. Annual bachelor programs under TU also report divisions. A reusable result system must therefore treat the grading rule as data, not as code. Anka provides three schemes: `tu_gpa`, `neb_gpa` and `division`.');

  b.h2('2.2 Review of Existing Systems');
  b.p('Several kinds of systems are used for results and student records. They solve parts of the problem but leave gaps for a small or medium institution.');
  b.table('Comparison of existing approaches with Anka', ['Approach', 'Strengths', 'Gaps for a campus or school'], [
    ['Paper ledger and spreadsheet', 'No cost, familiar', 'Manual GPA, copy errors, no back paper history, no verification, no analytics'],
    ['University result portal (TU examination results)', 'Authoritative result for the university examination', 'Shows the final result only; does not cover internal marks, attendance, classes or institution-level analysis'],
    ['Board result portals and SMS (NEB)', 'Wide reach for board results', 'No teacher workflow, no early warning, no daily class tools'],
    ['Open-source school software (for example OpenSIS, Fedena)', 'Feature rich, community support', 'Grading rules are not Nepal specific, heavy to install and configure, no back paper model'],
    ['Learning management systems (for example Moodle)', 'Course content, quizzes, submissions', 'Not designed for credit-weighted GPA, ranking and result publication'],
    ['Anka (this project)', 'Configurable grading, back papers, ranking, risk score, verified marksheets, email, daily classes, unbranded', 'Single institution per installation, no file uploads'],
  ], [2.2, 2.7, 3.6]);
  b.h2('2.3 Literature Review');
  b.p('Educational data mining studies how data collected by educational institutions can be turned into information that helps students and teachers. Romero and Ventura [1] review the field and list prediction of performance, grouping of students and the detection of undesirable behavior among the main tasks. Anka follows the same direction in a deliberately simple and explainable form: a regression forecast of the next GPA, k-means grouping of students, and a risk score whose reasons are shown to the user.');
  b.p('Early warning for students at risk has been reported to depend on a small number of strong indicators such as attendance, previous results and assessment scores. Using weights that are visible to the teacher avoids the "black box" problem: a teacher can see why a student was flagged and discuss it with the student. This is the design choice behind the risk score in Section 4.5.');
  b.p('For ranking, the stable merge sort described by Cormen et al. [2] runs in O(n log n) time in the worst case and keeps equal elements in their original order, which matters when students with equal GPA must be listed consistently. A binary heap [2] gives the top k students in O(n log k) without sorting everyone. For grouping, the k-means algorithm [3], [4] partitions points into k clusters by repeatedly assigning points to the nearest center and recomputing centers. The Pearson correlation coefficient [5] measures the linear relation between two variables, for example attendance and GPA, and simple linear regression by least squares gives the trend line used for forecasting.');
  b.p('For security, passwords are hashed with bcrypt, an adaptive function designed by Provos and Mazieres [6], and sessions use JSON Web Tokens as defined in RFC 7519 [7]. Emails are sent with the Simple Mail Transfer Protocol described in RFC 5321 [8].');
  b.h2('2.4 Technology Background');
  b.table('Technologies used and their role', ['Technology', 'Role in the system'], [
    ['React 18 and Vite', 'Component based client application and fast build tool'],
    ['Framer Motion, Recharts, three.js, qrcode.react', 'Interface motion, charts, 3D scenes on public pages, QR code of marksheets'],
    ['Node.js and Express', 'REST API, authentication middleware, role checks'],
    ['MySQL 8.4 with mysql2', 'Relational storage with transactions and foreign keys'],
    ['bcryptjs and jsonwebtoken', 'Password hashing and signed session tokens'],
    ['Nodemailer with Gmail SMTP', 'Email delivery through an application password'],
    ['puppeteer-core (Microsoft Edge)', 'Browser end-to-end tests'],
  ], [3.0, 5.0]);
}
