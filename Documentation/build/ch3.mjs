export default function (b, F) {
  b.chapter('System Analysis');
  b.p('System analysis studies the existing way of working, identifies what the new system must do, checks that it can be built with the available time, skills and tools, and models the system from the process, data and object points of view.');

  b.h2('3.1 Requirement Identification');
  b.h3('3.1.1 Study of the Existing System');
  b.p('The existing process in a typical campus was studied through the project syllabus, the published TU examination rules and the experience of a student who has taken part in the process for four years. It works in five manual steps: (1) subject teachers record internal marks in a register; (2) the board examination marks arrive on paper; (3) the examination office copies all marks into a spreadsheet and calculates grades; (4) a printed result is put on the notice board and marksheets are typed one by one; (5) failed students are noted down for the next back paper examination. The weaknesses are repeated data entry, calculation mistakes, lack of history, no trend analysis, and no verification of marksheets.');
  b.h3('3.1.2 Requirement Collection');
  b.p('Requirements were collected by studying the result cycle of a semester and by writing user stories for each role. They were grouped into functional requirements (what the system does) and non-functional requirements (how well it does it).');
  b.h3('3.1.3 Functional Requirements');
  b.table('Functional requirements', ['ID', 'Requirement', 'Actor'], [
    ['FR1', 'Register, sign in, sign out, change and reset a password by email link', 'All users'],
    ['FR2', 'Approve or reject new teacher accounts', 'Administrator'],
    ['FR3', 'Create and edit programs with grading scheme, pass percentage, term names and term count', 'Administrator'],
    ['FR4', 'Manage subjects with credit, internal and external full marks, and assigned teacher', 'Administrator'],
    ['FR5', 'Manage students with symbol number, program, term, batch and guardian email', 'Administrator'],
    ['FR6', 'Enter marks by typing or CSV import, with validation against the full marks', 'Teacher'],
    ['FR7', 'Enter back paper marks for students who have not cleared a subject', 'Teacher'],
    ['FR8', 'Take attendance with present, late and absent; compute the 80% eligibility', 'Teacher'],
    ['FR9', 'Calculate results for a program, term and exam year, rank the cohort, and publish or unpublish', 'Administrator'],
    ['FR10', 'Promote students to the next term and keep the history of earlier terms', 'Administrator'],
    ['FR11', 'Show marksheet with QR code, transcript with CGPA and backlogs, and attendance', 'Student'],
    ['FR12', 'Search a result by symbol number and verify a marksheet by code without signing in', 'Public'],
    ['FR13', 'Check a personal GPA with back papers using editable grade bands', 'Public, student'],
    ['FR14', 'Show student insights: GPA forecast, percentile, risk score and reasons', 'Student, teacher'],
    ['FR15', 'Show class analytics: statistics, top performers, clusters, correlation', 'Teacher, administrator'],
    ['FR16', 'Send result, approval, reset, notice and risk emails through a queue; log and preview every message', 'System, administrator'],
    ['FR17', 'Publish notices for chosen audiences', 'Administrator'],
    ['FR18', 'Record an audit log of important actions', 'System'],
    ['FR19', 'Maintain a weekly timetable and reject clashes', 'Teacher, administrator'],
    ['FR20', 'Record what was taught in each class (class diary)', 'Teacher'],
    ['FR21', 'Create assignments and track submitted, late and missing work with marks', 'Teacher'],
    ['FR22', 'Show today\'s classes and due assignments to students', 'Student'],
    ['FR23', 'Allow optional institution branding on marksheets and emails', 'Administrator'],
  ], [0.7, 6.0, 1.9], { center: [0] });
  b.h3('3.1.4 Non-functional Requirements');
  b.table('Non-functional requirements', ['Quality', 'Requirement'], [
    ['Security', 'Passwords hashed with bcrypt; JWT sessions; role checks on every route; rate limiting on public lookups; no sensitive fields in public data'],
    ['Accuracy', 'GPA and ranking must equal hand calculation; marks are validated before saving; results are calculated inside database transactions'],
    ['Usability', 'Clear navigation, command palette, keyboard friendly forms, light and dark themes, responsive down to phone width'],
    ['Performance', 'Common pages respond within one second for a cohort of a few hundred students; ranking in O(n log n)'],
    ['Reliability', 'Email queue with up to three attempts; published results stay published after back paper recalculation'],
    ['Portability', 'Runs on Windows, Linux or macOS with Node.js and MySQL; portable MySQL copy provided'],
    ['Maintainability', 'Grading scales and rules are data; one Express router per concern; automated tests'],
    ['Neutrality', 'No built-in institution name or branding; every label is editable'],
  ], [1.6, 7.0]);

  b.h2('3.2 Feasibility Study');
  b.h3('3.2.1 Technical Feasibility');
  b.p('Every technology used is open source, well documented and runs on an ordinary laptop: Node.js, Express, React, Vite and MySQL. The developer has prior experience with JavaScript and relational databases. A portable MySQL copy removes installation difficulty. The project is therefore technically feasible.');
  b.h3('3.2.2 Operational Feasibility');
  b.p('The system replaces spreadsheets and paper but keeps the same roles and the same sequence of work. Teachers enter marks in a grid that behaves like a spreadsheet, with CSV import for existing sheets. Students use the same symbol number they already know. The interface needs no training beyond a short walk-through. Operation is feasible.');
  b.h3('3.2.3 Economic Feasibility');
  b.table('Estimated cost of development and a first deployment', ['Item', 'Cost'], [
    ['Software licences (Node.js, React, MySQL, VS Code, Git)', 'NPR 0 (open source)'],
    ['Developer effort (one student, 17 weeks, part time)', 'Academic work'],
    ['Gmail account with app password for email', 'NPR 0'],
    ['Hosting for a small campus (virtual server or on-premise PC)', 'About NPR 6,000 to 15,000 per year, or existing computer'],
    ['Domain name (optional)', 'About NPR 1,500 per year'],
  ], [5.4, 3.2]);
  b.p('The system costs almost nothing to build, and the running cost is small compared with the staff time saved every examination cycle. The project is economically feasible.');
  b.h3('3.2.4 Schedule Feasibility');
  b.p('The work was planned over seventeen weeks. Figure 3.1 shows the schedule. Because the work was divided into small increments, a delay in one area (for example the frontend design) did not block the others.');
  b.fig(F('gantt'), 'Project schedule (Gantt chart)', 6.0);

  b.h2('3.3 Process Modelling');
  b.p('Data flow diagrams (DFD) show how data moves between the external entities, the processes and the data stores.');
  b.h3('3.3.1 Context Diagram (DFD Level 0)');
  b.p('Figure 3.2 shows the whole system as a single process. The administrator supplies the academic setup and publication decisions, teachers supply marks, attendance and class records, students and the public receive results and insights, and guardians receive result emails.');
  b.fig(F('dfd0'), 'Context diagram (DFD level 0)', 6.0);
  b.h3('3.3.2 DFD Level 1');
  b.p('Figure 3.3 breaks the system into six processes: managing the academic setup, recording marks and back papers, calculating results, publishing and notifying, analyzing and ranking, and daily class automation.');
  b.fig(F('dfd1'), 'DFD level 1', 6.0);

  b.h2('3.4 Data Modelling');
  b.p('The database has sixteen tables. The core entities are `programs`, `users`, `teachers`, `students`, `subjects`, `marks`, `results` and `attendance`. The daily class module adds `timetable`, `class_logs`, `assignments` and `assignment_status`. The supporting tables are `notices`, `email_logs`, `audit_logs` and `settings`. Figure 3.4 shows the entity relationship diagram.');
  b.fig(F('er'), 'Entity relationship diagram', 6.1);
  b.p('Three design decisions deserve attention. First, `marks` has an `attempt` column, so a back paper is another row for the same student and subject. Second, `results` stores a `backpapers` count and a unique `verify_code` that is printed on the marksheet. Third, the program row carries the term label, term offset and terms per year, so that "Semester 7", "Year 3" and "Grade 11" are all produced from data.');

  b.h2('3.5 Object Modelling');
  b.h3('3.5.1 Use Case Diagram');
  b.p('Figure 3.5 shows the use cases of the four actors. The public visitor can look up and verify results and use the GPA checker. Students see their own marksheets, attendance and insights. Teachers manage marks, back papers, attendance and classes of their own subjects only. The administrator manages the institution and the result cycle.');
  b.fig(F('usecase'), 'Use case diagram', 6.1);
  b.table('Use case description: Calculate and publish results', ['Item', 'Description'], [
    ['Actor', 'Administrator'],
    ['Precondition', 'Marks for the term are entered; the administrator is signed in'],
    ['Main flow', '1. Choose program, term and exam year.\n2. System calculates subject grades, SGPA, status and class rank.\n3. Administrator reviews the list and publishes.\n4. System queues result emails to students and guardians.'],
    ['Alternative flow', 'If a student has a back paper pass, the effective attempt is used and the result is recalculated without changing the published state.'],
    ['Postcondition', 'Results are saved and visible to students; emails are logged'],
  ], [1.8, 6.8]);
  b.table('Use case description: Enter back paper marks', ['Item', 'Description'], [
    ['Actor', 'Teacher'],
    ['Precondition', 'The subject is assigned to the teacher; at least one student has not cleared it'],
    ['Main flow', '1. Open Marks entry and choose Back papers.\n2. System lists students who still owe the subject with every earlier sitting.\n3. Teacher enters marks for the chosen year and saves.\n4. System stores a new attempt and recalculates the original semester result.'],
    ['Alternative flow', 'Marks above the full mark are rejected with a message.'],
    ['Postcondition', 'A passing sitting clears the backlog; GPA and CGPA are updated'],
  ], [1.8, 6.8]);
  b.h3('3.5.2 Class Diagram');
  b.p('Figure 3.6 shows the main classes. The grading engine and result service work on `Marks`, `Subject` and `Program` and produce `Result` objects; the mail service is called by the result service when a result is published.');
  b.fig(F('classdiagram'), 'Class diagram of the main classes', 6.1);
  b.h3('3.5.3 Activity Diagram');
  b.p('Figure 3.7 shows the activity of calculating and publishing results, including the choice of the effective attempt.');
  b.fig(F('activity'), 'Activity diagram: calculate and publish results', 4.4);
  b.h3('3.5.4 Sequence Diagram');
  b.p('Figure 3.8 shows what happens when the administrator publishes results. The API publishes inside a transaction and only queues the emails; a separate worker sends them, so a slow mail server never blocks the administrator.');
  b.fig(F('sequence'), 'Sequence diagram: publish results and send email', 6.1);
  b.h3('3.5.5 State of a Result');
  b.table('States of a result row', ['State', 'Meaning', 'Moves to'], [
    ['Draft', 'Calculated but hidden from students', 'Published, recalculated draft'],
    ['Published', 'Visible to students, verifiable by code', 'Draft (unpublish), recalculated and still published after a back paper'],
    ['Fail', 'At least one subject not passed (reappear needed)', 'Pass after back papers are cleared'],
    ['Pass', 'All subjects passed on their effective attempt', 'None'],
  ], [1.4, 4.0, 3.2]);
}
