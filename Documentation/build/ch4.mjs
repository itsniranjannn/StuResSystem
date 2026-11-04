export default function (b, F) {
  b.chapter('System Design');
  b.p('The design translates the analysis into an architecture, a database schema, an interface, and the algorithms that produce results. This chapter follows the same order.');

  b.h2('4.1 Architecture Design');
  b.p('Anka uses a three-tier architecture. The presentation tier is a single page React application. The application tier is a stateless Node.js and Express REST API that checks the JSON Web Token on every request and applies the role of the user. The data tier is a MySQL database. The mail service is a worker inside the API process that reads queued messages from the database and sends them through Gmail SMTP.');
  b.fig(F('architecture'), 'System architecture', 6.0);
  b.p('Keeping the API stateless means it can be restarted at any time without losing sessions, and the same API can later serve a mobile client. Business rules live in service modules (`resultService`, `marksService`, `grading`, `attempts`, `ranking`, `insights`, `mailer`) and not in the route handlers, so each rule can be unit tested without a web server.');

  b.h2('4.2 Database Design');
  b.h3('4.2.1 Main Tables');
  b.table('Core tables and key columns', ['Table', 'Purpose', 'Key columns'], [
    ['programs', 'Course of study and its rules', 'code, name, level, grading_scheme, term_label, term_count, term_offset, terms_per_year, pass_percent, attendance_required'],
    ['users', 'Login accounts', 'email (unique), password (bcrypt hash), role, status, reset_token_hash, reset_expires'],
    ['teachers', 'Teacher profile', 'user_id, teacher_name, department, phone'],
    ['students', 'Student profile', 'user_id, program_id, roll_no (unique), semester, batch, guardian_email, status'],
    ['subjects', 'Syllabus entry', 'program_id, teacher_id, code, name, semester, credit, internal_full, external_full'],
    ['marks', 'One sitting of one subject', 'student_id, subject_id, exam_year, attempt, internal_marks, external_marks'],
    ['results', 'Calculated term result', 'student_id, semester, exam_year, gpa, grade, division, status, class_rank, backpapers, published, verify_code'],
    ['attendance', 'Daily attendance', 'student_id, subject_id, att_date, status'],
  ], [1.3, 2.0, 5.3]);
  b.table('Supporting tables', ['Table', 'Purpose'], [
    ['timetable', 'Weekly class slots: subject, weekday, start and end time, room'],
    ['class_logs', 'Class diary: one entry per subject per date with topic and notes'],
    ['assignments, assignment_status', 'Assignments and per-student status (submitted, late, missing), marks and feedback'],
    ['notices', 'Announcements with an audience (all, student, teacher)'],
    ['email_logs', 'Every outgoing message with status (queued, sent, failed, skipped), attempts and error'],
    ['audit_logs', 'Who did what and when'],
    ['settings', 'Optional institution branding values'],
  ], [2.6, 6.0]);
  b.h3('4.2.2 Integrity Rules');
  b.bullets([
    'Foreign keys with `ON DELETE CASCADE` remove dependent rows (for example the marks of a deleted student); authorship columns use `SET NULL` so that deleting a user does not delete history.',
    'Unique keys prevent duplicates: one account per email, one student per symbol number, one marks row per student, subject, exam year and attempt, one diary entry per subject and date, one status per assignment and student.',
    'A check constraint limits the timetable weekday to 0 to 6.',
    'Result calculation and publication run inside transactions, so a failure leaves no half-written result.',
  ]);
  b.h3('4.2.3 Back Paper Data Model');
  b.p('A back paper is a second row in `marks` with `attempt` 2 or higher and a later `exam_year`. The cohort of a result is the set of students having a regular attempt (attempt 1) in the result\'s exam year; later sittings of those students are included when the effective attempt is chosen. Figure 4.2 summarizes the life of a failed subject.');
  b.fig(F('backpaper'), 'Life cycle of a failed subject and its back paper', 6.0);

  b.h2('4.3 API Design');
  b.p('The API is organized as five routers mounted under `/api`. There are 82 route handlers in total. Table 4.3 lists the main endpoints of each router. All endpoints except the public ones require a valid token, and administrator, teacher and student routes check the role.');
  b.table('REST endpoints by router', ['Router', 'Count', 'Main endpoints'], [
    ['/api/auth', '8', 'POST /register, POST /login, GET /me, PUT /password, POST /forgot-password, POST /reset-password, GET /programs, GET /institution'],
    ['/api/admin', '36', 'programs, subjects, students and teachers CRUD; POST /results/calculate, /results/publish, /results/promote; GET /results/export.csv; insights and alerts; notices; audit; settings; mail (list, preview, test, retry)'],
    ['/api/teacher', '11', 'GET and PUT /subjects/:id/marks; POST /marks/import; GET and PUT /backpapers; GET and PUT /attendance; GET /analytics; GET /insights'],
    ['/api/results', '16', 'public search, marksheet, verify, stats; me/overview, marksheet, transcript, attendance, insights; ranking; notices'],
    ['/api/classroom', '11', 'GET and POST /timetable; GET /today; GET /diary; PUT /logs; assignments CRUD and status tracking'],
  ], [1.4, 0.8, 6.4], { center: [1] });
  b.p('Responses use one shape: `{ success: true, ... }` on success and `{ success: false, message }` with a suitable status code (400 invalid input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict, 429 too many requests) on failure. The message is written for the user and never exposes internal details.');

  b.h2('4.4 Interface Design');
  b.h3('4.4.1 Design Principles');
  b.bullets([
    '**Neutral and professional.** A restrained navy palette with brass as the accent, no decorative clutter, and typography with a serif for headings on marksheets and a sans-serif for the interface.',
    '**One design system.** Shared tokens for color, spacing, radius and shadow; shared components for cards, tables, chips, dropdowns, segmented controls, drawers, modals and toasts. Light and dark themes use the same tokens.',
    '**Precision for data work.** Marks entry behaves like a spreadsheet: Enter moves down a column, Ctrl+S saves, invalid cells are marked, unsaved changes are shown.',
    '**Orientation.** A collapsible sidebar grouped by task, breadcrumbs, a command palette opened with Ctrl+K, and a notification menu.',
    '**Responsive and accessible.** Layouts work from desktop to 390 pixel phones; controls have labels; focus is visible; motion is short.',
  ]);
  b.h3('4.4.2 Navigation by Role');
  b.table('Pages available to each role', ['Role', 'Pages'], [
    ['Public', 'Landing, Result search, Verify marksheet, GPA checker, Algorithms explorer, Sign in, Register, Forgot and reset password'],
    ['Student', 'Dashboard, Classes, Results (marksheets and transcript), Attendance, Insights, GPA checker, Merit list, Account'],
    ['Teacher', 'My subjects, Classes, Marks entry (regular and back papers), Attendance, Class insights, Merit list, Account'],
    ['Administrator', 'Dashboard, Insights, Programs, Subjects, Students, Teachers, Classes, Results, Merit list, Mail center, Notices, Branding, Audit log, Algorithms'],
  ], [1.4, 7.2]);

  b.h2('4.5 Algorithm Design');
  b.p('All algorithms listed here are implemented from scratch in the `backend/utils` folder without a library, and they are explained interactively on the `/algorithms` page of the running system.');
  b.h3('4.5.1 Grade Lookup by Binary Search');
  b.p('A grading scale is an ascending list of bands, each with a minimum percentage, a grade and a grade point. To find the band of a percentage the algorithm searches for the last band whose minimum is not greater than the percentage. Binary search does this in O(log n).');
  b.code('bandFor(scale, percent):\n  lo = 0; hi = len(scale) - 1\n  while lo < hi:\n    mid = (lo + hi + 1) div 2\n    if scale[mid].min <= percent: lo = mid\n    else: hi = mid - 1\n  return scale[lo]');
  b.table('TU grade scale used by default (editable per program)', ['Percentage', 'Grade', 'Grade point'], [
    ['90 and above', 'A', '4.0'], ['80 to below 90', 'A-', '3.7'], ['75 to below 80', 'B+', '3.3'], ['70 to below 75', 'B', '3.0'],
    ['65 to below 70', 'B-', '2.7'], ['60 to below 65', 'C+', '2.3'], ['55 to below 60', 'C', '2.0'], ['50 to below 55', 'C-', '1.7'],
    ['45 to below 50', 'D+', '1.3'], ['40 to below 45', 'D', '1.0'], ['Below 40, or below pass mark in the external part', 'F', '0.0'],
  ], [4.0, 1.8, 2.0], { center: [1, 2] });
  b.h3('4.5.2 Subject, Semester and Cumulative Results');
  b.p('For every subject the engine computes the percentage from internal and external marks, checks the pass rule (overall percentage and external percentage both at least the program pass mark), looks up the grade and grade point, and then computes the semester GPA as the credit-weighted mean. A semester is *pass* only when every subject is passed. The CGPA is the credit-weighted mean of the semester GPAs. For the `division` scheme the GPA is the percentage on a 4.0 scale and the division comes from the total percentage (Distinction 80, First 60, Second 48, Pass 40).');
  b.h3('4.5.3 Effective Attempt for Back Papers');
  b.code('pickEffective(attempts):\n  sort attempts by (exam_year, attempt)\n  for each attempt: evaluate subject\n  i = index of first passing attempt, else last\n  return attempts[i] with history and flag\n         cleared_by_backpaper = (i > 0 and passed)');
  b.p('The first passing sitting is chosen so that a student who passes a re-sit but later appears again does not lose the pass. If no sitting passes, the latest one is used so that the most recent marks are shown.');
  b.h3('4.5.4 Ranking by Merge Sort');
  b.p('Students of a cohort are ordered by GPA, then by total marks, then by symbol number for stability. Merge sort divides the list, sorts both halves and merges them; it is O(n log n) in every case. Equal students receive the same rank (competition ranking: 1, 2, 2, 4), which is the fair choice for equal scores.');
  b.h3('4.5.5 Top-k Selection with a Binary Heap');
  b.p('The top performers of a subject are found with a min-heap of size k. Each item is compared with the smallest of the current k; if it is larger it replaces it. The cost is O(n log k), which is cheaper than sorting everyone when k is small.');
  b.h3('4.5.6 Statistics, Percentile and Z-score');
  b.p('Descriptive statistics (mean, median, standard deviation, minimum, maximum, pass rate) are computed in a single pass plus a sort for the median. The percentile of a student is found by binary search in the sorted marks, and the z-score is (x - mean) / standard deviation.');
  b.h3('4.5.7 Linear Regression and Forecast');
  b.p('The trend of GPA across terms is fitted by least squares: slope = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - (sum(x))^2). The next GPA is forecast by extending the line and is clamped between 0 and 4. The slope also feeds the risk score.');
  b.h3('4.5.8 Pearson Correlation');
  b.p('The correlation between attendance and GPA (or internal and external marks) is r = cov(x, y) / (sd(x) * sd(y)). A value close to +1 tells the teacher that students who attend more also score more.');
  b.h3('4.5.9 K-means Clustering');
  b.p('Students are grouped into three clusters by their GPA and attendance. Both features are scaled to the range 0 to 1 first. The algorithm starts from deterministic centers chosen farthest-first (so the same data always gives the same groups), assigns each student to the nearest center, recomputes the centers as means, and repeats until no assignment changes or fifty iterations have run. The clusters are shown to teachers as support groups.');
  b.h3('4.5.10 Explainable Risk Score');
  b.table('Risk score rules (maximum 100)', ['Condition', 'Points', 'Reason shown to the user'], [
    ['Attendance below 80%', 'up to 35', 'Attendance X% is below the 80% exam-eligibility requirement'],
    ['Failed subjects', '12 each, up to 30', 'N failed subject(s) to clear'],
    ['GPA slope below -0.1', 'up to 20', 'GPA is trending downward over recent terms'],
    ['Latest GPA below 2.2', '10', 'Latest GPA is low'],
    ['Internal average below 50%', '10', 'Internal assessment average is weak'],
  ], [3.0, 1.6, 4.0]);
  b.p('A score of 55 or more is *high* risk, 25 to 54 is *medium* and below 25 is *low*. Because every point has a stated reason, a teacher can explain the result to the student.');
  b.h3('4.5.11 Tokens and Email Queue');
  b.p('Password reset links use a random token whose SHA-256 hash is stored with an expiry of thirty minutes, so a copy of the database does not reveal a usable link. Outgoing emails are first written to `email_logs` with status queued. A worker takes the oldest queued message, sends it, and marks it sent. On failure it waits (1.5 seconds times the attempt number) and retries until three attempts are used, then marks it failed. Demo addresses on reserved domains are never delivered and are logged as skipped.');

  b.h2('4.6 Security Design');
  b.table('Security measures', ['Threat', 'Measure'], [
    ['Stolen database', 'bcrypt password hashes (cost 10); reset tokens stored only as hashes'],
    ['Unauthorized access', 'JWT on every private route; role check per router; teachers can touch only their own subjects (HTTP 403 otherwise)'],
    ['Brute force and scraping', 'Per-address rate limit on public lookups (40 per minute by default); generic message for wrong credentials'],
    ['Injection', 'Parameterized queries everywhere; input length and range validation'],
    ['Forged marksheets', 'Unique ten-character code and QR code verified against the database'],
    ['Accidental data loss', 'Confirmation dialogs; cascade rules; published results locked against edits'],
    ['Secret leakage', 'Credentials only in `backend/.env`, which is excluded from version control'],
  ], [2.2, 6.4]);

  b.h2('4.7 Email Design');
  b.p('Every email is an HTML message with inline styles (mail clients ignore style sheets), a navy header that shows the institution name only when one is configured, a content card, a key-value table for results, one clear button, and a plain footer. Eight templates exist: welcome, password reset, teacher approved, result, guardian result, risk alert, notice and test. The same palette as the web application keeps the experience consistent.');
}
