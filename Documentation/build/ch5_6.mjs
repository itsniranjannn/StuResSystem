export default function (b, F) {
  // ================================================================ CHAPTER 5
  b.chapter('Implementation and Testing');
  b.h2('5.1 Implementation');
  b.h3('5.1.1 Development Environment');
  b.table('Tools used', ['Item', 'Tool'], [
    ['Operating system', 'Windows 11'],
    ['Editor and version control', 'Visual Studio Code, Git, GitHub'],
    ['Runtime', 'Node.js 24'],
    ['Database', 'MySQL 8.4 (portable copy in the project folder, port 3308)'],
    ['Server libraries', 'express, mysql2, bcryptjs, jsonwebtoken, nodemailer, cors, morgan'],
    ['Client libraries', 'react, react-router-dom, vite, framer-motion, recharts, three, qrcode.react, lucide-react'],
    ['Testing', 'node:test, fetch based API suites, puppeteer-core with Microsoft Edge'],
    ['Diagrams and documents', 'SVG diagrams rendered by Edge; docx and pptxgenjs for documents'],
  ], [2.6, 6.0]);
  b.h3('5.1.2 Project Structure');
  b.code('StuResSystem/\n  backend/\n    server.js            Express app and router mounting\n    routes/              auth, admin, teacher, results, classroom\n    utils/               grading, attempts, ranking, algorithms, insights,\n                         resultService, marksService, mailer, emailTemplates\n    db/                  schema.sql, setup.js (schema and seed data)\n    tests/               unit tests, API flow tests, smoke, classroom tests\n  frontend/\n    src/pages/           public, admin, teacher, student, Classes\n    src/components/      Shell, CommandPalette, Marksheet, Scenes, ui\n    src/styles.css       design system tokens and components\n  e2e/                   browser end-to-end tests\n  .mysql/                portable MySQL (not in Git)');
  b.p('The backend has about 2,200 lines, the frontend about 4,600 lines of JavaScript, JSX and CSS, and the automated tests about 1,500 lines, so the repository holds roughly 8,500 lines in total.');

  b.h3('5.1.3 Grading Engine');
  b.p('The grading engine (`grading.js`) exposes `gradeFor`, `evaluateSubject`, `computeSemester` and `cgpa`. The three scales are plain arrays of bands, so a campus can change a band without changing the algorithm. The excerpt below shows how a subject is evaluated.');
  b.code('function evaluateSubject(row, scheme, passPercent) {\n  const full = internal_full + external_full;\n  const total = internal_marks + external_marks;\n  const percent = full ? (total / full) * 100 : 0;\n  const extOk = external_full === 0 ||\n                (external_marks / external_full) * 100 >= passPercent;\n  const passed = percent >= passPercent && extOk;\n  const band = passed ? gradeFor(percent, scheme) : SCALES[scheme][0];\n  return { total, full, percent, passed, grade: band.grade, point: band.point };\n}');
  b.h3('5.1.4 Back Paper Processing');
  b.p('`attempts.js` groups the sittings of each student and subject and selects the effective attempt. `resultService.cohortAttempts` loads the regular attempts of the result year and all later sittings, `calculateResults` evaluates them, and `setPublished` changes the published flag. When a teacher saves back paper marks, `marksService.saveBackPapers` inserts the new attempt, and the service recalculates the original semester result for every affected student. A result that was already published stays published, so a student sees the improved GPA immediately.');
  b.h3('5.1.5 Result Calculation and Ranking');
  b.p('For each student the service computes subject grades, the semester GPA, the percentage, the status and the division; then `rankStudents` orders the cohort with merge sort and assigns competition ranks. A ten-character verification code is generated for every result row.');
  b.h3('5.1.6 Email Service');
  b.p('`mailer.js` writes each message to `email_logs`, and a worker sends one queued message at a time. The mail center page shows counters (sent, queued, failed, skipped), the connection state, a test form, a filterable log and a preview of every message. When no Gmail account is configured the messages are still logged, with status skipped, so the system works in a demonstration without credentials.');
  b.h3('5.1.7 Daily Class Automation');
  b.p('`routes/classroom.js` implements the timetable, class diary and assignments. When a slot is added the API checks for overlapping time on the same weekday for the same teacher or for the same program and term, and answers HTTP 409 with the name of the clashing subject. A diary entry is stored with an upsert, so saving again for the same subject and date edits the entry. The assignment tracker saves a status and optional marks for each student and checks the marks against the maximum.');
  b.h3('5.1.8 Frontend Implementation');
  b.p('The client is a single page application with route level code splitting. A `Shell` component provides the sidebar, top bar, command palette, theme toggle and notification menu for every signed-in role. Shared components (`Select`, `Seg`, `Modal`, `Drawer`, `Chip`, `PageHeader`, `Field`, toast and confirm dialogs) are in one file so that every page looks and behaves the same. The marksheet component prints cleanly and carries the QR code produced by `qrcode.react`.');

  b.h2('5.2 Testing');
  b.p('Testing was done at four levels so that each kind of defect is found where it is cheapest to find. All suites can be run locally by following the README.');
  b.table('Test suites', ['Level', 'Tool', 'Scope', 'Result'], [
    ['Unit', 'node:test', 'Grading, ranking, heap, regression, k-means, risk score, email queue with a local SMTP server, reserved domains', '18 of 18 passed'],
    ['API flows', 'fetch (tests/flows.mjs)', 'Authentication, CRUD of every entity, marks, CSV import, back papers, attendance, publish, promote, public pages, a 59-endpoint by 4-role permission matrix, rate limit', '58 of 58 passed'],
    ['Smoke', 'fetch (tests/smoke.mjs)', 'Dashboard counts, student overview, verification, CSV import, attendance, analytics, insights', '43 passed, 0 failed'],
    ['Classroom', 'fetch (tests/classroom.mjs)', 'Timetable clash rules, today view, diary, assignments, permissions', '32 of 32 passed'],
    ['Browser', 'puppeteer-core with Edge', 'Public pages, sign in, registration, every admin, teacher and student page, forms, dialogs, shortcuts, phone and tablet widths, dark theme', '56 of 58 steps passed on the best clean run'],
  ], [0.9, 1.6, 4.4, 1.7]);
  b.p('The browser suite is sensitive to the speed of the computer. On a computer with little free memory, different steps timed out in different runs, while the same steps passed when the machine was idle. For this reason the browser result is reported as a range and not as a guarantee. The browser suite did find real defects, which were fixed: the command palette stayed open after navigation, the marks page was missing an import, and the back paper screen crashed because of a missing import. These were found because the tests drive the real pages.');
  b.h3('5.2.1 Test Cases');
  b.table('Selected functional test cases', ['ID', 'Test', 'Input / action', 'Expected result', 'Result'], [
    ['TC1', 'Sign in with wrong password', 'Valid email, wrong password', 'HTTP 401 with a generic message', 'Pass'],
    ['TC2', 'Teacher registration', 'Register as teacher', 'Account pending; cannot sign in until approved', 'Pass'],
    ['TC3', 'Duplicate symbol number', 'Register with an existing symbol number', 'Rejected with a clear message', 'Pass'],
    ['TC4', 'Marks above full marks', 'Internal 45 where full is 40', 'Rejected; nothing saved', 'Pass'],
    ['TC5', 'CSV import with unknown symbol numbers', 'File with one valid and one unknown row', 'Valid row saved; skipped rows reported', 'Pass'],
    ['TC6', 'GPA calculation', 'Three subjects of 3 credits with 67.5%, 82.5%, 80%', 'SGPA 3.37 (2.7, 3.7, 3.7)', 'Pass'],
    ['TC7', 'Subject fails on external part', 'Total 45% but external below 40%', 'Subject failed; grade F', 'Pass'],
    ['TC8', 'Back paper clears a failure', 'Failed subject, back paper 55%', 'Effective attempt is the back paper; semester GPA recalculated', 'Pass'],
    ['TC9', 'Back paper fails again', 'Second sitting 33%', 'Student stays a candidate; attempt count increases', 'Pass'],
    ['TC10', 'Back papers do not leak into cohort', 'Roster, analytics and ranking of the regular exam', 'Only attempt 1 rows are used', 'Pass'],
    ['TC11', 'Publish results', 'Publish a calculated term', 'Students see them; emails queued', 'Pass'],
    ['TC12', 'Unpublish', 'Unpublish a term', 'Students no longer see it', 'Pass'],
    ['TC13', 'Verify genuine code', 'Open /verify/CODE', 'Shows genuine marksheet with student details', 'Pass'],
    ['TC14', 'Verify fake code', 'Open /verify/AAAAAAAAAA', 'Shows no such marksheet', 'Pass'],
    ['TC15', 'Public rate limit', 'More than 40 lookups in a minute', 'HTTP 429', 'Pass'],
    ['TC16', 'Permission matrix', 'Each endpoint with each role', 'Allowed only for permitted roles (59 endpoints, 4 roles)', 'Pass'],
    ['TC17', 'Reserved email domain', 'Send to a .test address with email configured', 'Logged as skipped; never delivered', 'Pass'],
    ['TC18', 'Email retry', 'SMTP failure', 'Retried up to 3 times then marked failed', 'Pass'],
    ['TC19', 'Timetable clash', 'Add a slot overlapping the same teacher', 'HTTP 409 with the clashing subject', 'Pass'],
    ['TC20', 'Teacher edits another teacher\'s subject', 'POST /timetable for a foreign subject', 'HTTP 403', 'Pass'],
    ['TC21', 'Diary duplicate', 'Save the same subject and date twice', 'One entry, updated topic', 'Pass'],
    ['TC22', 'Assignment marks above maximum', 'Marks 11 where maximum is 10', 'Rejected with HTTP 400', 'Pass'],
  ], [0.6, 2.0, 2.3, 2.7, 0.7], { center: [0, 4] });
  b.h3('5.2.2 Email Verification');
  b.p('The email pipeline was tested without sending real messages. A local SMTP server receives a queued message and the test checks that the message is delivered and logged as sent; a second test stops the server and checks the retry and the final failed state; a third test confirms that a reserved demo domain is skipped even when email is configured. The HTML of each template was rendered in a browser and reviewed for layout (Figure A.13 in the appendix). A real Gmail account must be configured by the administrator for live delivery; the connection can be checked from the Mail center with the test message.');
  b.h3('5.2.3 Defects Found and Fixed');
  b.table('Notable defects found during testing', ['Defect', 'Found by', 'Fix'], [
    ['Date of birth sent as an ISO string caused a server error when a student was edited', 'API flow test', 'Normalize the date before saving'],
    ['Mail retry re-queued messages even when email was not configured', 'API flow test', 'Retry does nothing when unconfigured and skips reserved domains'],
    ['Confirmation dialog appeared behind a drawer', 'Browser test', 'Raised the overlay layer'],
    ['The algorithms page required a login', 'Browser test', 'Made the route public'],
    ['Phone layout overflowed because of fixed minimum widths', 'Browser test', 'Responsive widths and truncation of long labels'],
    ['Command palette stayed on screen after choosing a page', 'Browser test', 'Removed the exit animation that never finished'],
    ['Back paper screen crashed (missing import)', 'Visual check while preparing figures', 'Added the import; scanned all pages for undefined names'],
    ['Seed data had a hard-coded institution name', 'Review', 'Defaults are blank; branding is optional'],
  ], [4.0, 1.8, 2.8]);
  b.h2('5.3 Result Analysis');
  b.p('The seeded database contains 97 students in three programs, 68 subjects, about 1,800 mark rows (including 71 back paper sittings) and about 11,700 attendance records. It was used to check that the system behaves as expected on a realistic amount of data. With this data, the result calculation of a term of 14 students completes in a fraction of a second and every public and portal page loads within about one second on a laptop with limited memory. The ranking, back paper and permission checks give identical results on every run because the algorithms are deterministic.');
  b.p('The objectives of Section 1.3 were checked one by one. The configurable grading engine, back paper model, ranking and analytics, risk score, role based security with QR verification, email queue, daily class tools and neutral branding are all implemented and covered by at least one automated test. The two items that cannot be proven by the tests are conformity with the official TU regulation and live Gmail delivery; both depend on information that only the institution has.');

  // ================================================================ CHAPTER 6
  b.chapter('Conclusion and Future Recommendations');
  b.h2('6.1 Conclusion');
  b.p('Anka replaces the paper ledger and spreadsheet chain of a campus with one database and a set of role based screens. Teachers enter marks once; the system calculates grades, semester and cumulative GPA, ranks the cohort, handles back paper sittings without losing history, warns about students at risk, publishes results, and sends emails. Students and the public can read results and verify printed marksheets. The daily class module extends the same platform to timetables, class diaries and assignments. The product carries no institution name, so a school, a higher secondary college or a university campus can adopt it by entering its own programs and rules.');
  b.p('The work met the objectives set in Chapter 1 and applied the algorithms expected from the project: sorting, searching, heap selection, statistics, regression, correlation and clustering, all written without libraries and explained in the running system. Building and testing the system also gave practical experience in database design, REST API design, security, user interface design, automated testing and documentation.');
  b.h2('6.2 Future Recommendations');
  b.bullets([
    'Verify the grade table and back paper rules against the official TU regulation for each year and add rule versions so that old batches keep their old rules.',
    'Add multi-tenancy so that one server can host several institutions.',
    'Add file upload for assignments and a messaging feature between teachers and students.',
    'Build a mobile application and push notifications, and add SMS delivery for guardians without email.',
    'Add parent accounts, fee management and a document archive.',
    'Use real examination data (with permission) to validate the risk score weights and replace the hand-written weights with a trained model whose reasons are still shown to users.',
    'Make the browser test suite independent of machine speed with explicit waiting on application events, and run all suites in continuous integration.',
    'Export marksheets and the transcript as signed PDF documents.',
  ]);
}
