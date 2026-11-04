# Anka: Student Result Analysis and Ranking System

BCA 8th semester **Project III** (TU, CACS452). A role-based result and daily-class management platform for any institution: schools, higher secondary colleges and university campuses. It ships **unbranded**: no institution name appears anywhere until an admin chooses to add one (Admin > Branding, optional). Programs, subjects, terms and grading rules are all editable data, nothing is hard-coded to one school or college.
Stack: **React 18 + Vite + Framer Motion + three.js** (client), **Node.js + Express** (API), **MySQL 8.4** (portable copy inside this folder), **Nodemailer** (Gmail).

## What it solves

| Problem in many education offices | What Anka does |
|---|---|
| Results take weeks, kept in paper ledgers | Marks entered once, GPA and ranks calculated automatically, published in one click |
| Forged marksheets | Every marksheet has a QR code and a 10-letter code, verifiable at `/verify` |
| Failing students noticed too late | Early-warning risk score from attendance, GPA trend, failures and internal marks |
| Parents learn results from a notice board | Result emails to student and guardian on publish |
| Each program has its own grading rule | TU semester GPA, NEB grade points and percentage divisions in one engine, set per program |
| Attendance guessed before exams | 80% eligibility tracked per subject and per student |

## Back papers and the TU grading engine
* Each mark row has an attempt number. A back paper is attempt 2, 3 and so on, in a later exam year. The latest passing sitting replaces the failed one, the original semester result is recalculated, and the earlier sittings stay in the history. Published results stay published.
* TU-style scheme: credit-weighted semester GPA and CGPA, grade bands editable per program, pass mark on the whole subject and on the external paper.
* `/gpa` is a public personal GPA checker (also in the student menu): enter marks per semester, add back papers, and see SGPA and CGPA. Bands and pass rules are editable and nothing is stored on the server.
* The grade table and back-paper rules follow the commonly used TU scheme but could not be verified against the official document, so check them against your campus rules and adjust in Programs.

## Daily classes
One **Classes** page for every role: today's classes, a weekly timetable (teacher and class clash detection), a class diary (what was taught each day) and assignments with per-student submitted / late / missing status and marks.

## Roles
* **Public**: result search by symbol number, marksheet verification, a live grading calculator on the home page.
* **Student**: dashboard, marksheets and transcript (CGPA, backlogs), attendance, insights (forecast, percentile, risk), merit list.
* **Teacher**: own subjects, marks entry (typing or CSV import), attendance in two taps, class and subject insights.
* **Admin**: programs, subjects, students (with a quick-view drawer), teachers (approve), results workflow (calculate, publish with email, promote), cohort insights, mail center, notices, institution settings, audit log.
* **Everyone**: `Ctrl/Cmd + K` command palette, notifications, light and dark themes, collapsible sidebar.

## Algorithms (all implemented from scratch in `backend/utils/`, explained live at `/algorithms`)
Merge-sort ranking with competition ties; binary search over grade bands and for percentile rank; credit-weighted GPA/CGPA; min-heap top-K; descriptive statistics and z-score; least-squares linear regression (GPA forecast); Pearson correlation; k-means clustering; weighted early-warning risk score; bcrypt and SHA-256 token hashing; persistent email queue with retries.

The CACS452 syllabus describes a practical project lifecycle (proposal, requirement analysis, feasibility, design, implementation, testing, defense) and does not prescribe particular algorithms. The list above was chosen for relevance to result processing. Confirm the checklist with your supervisor.

## Run it (Windows)
Prerequisite: Node.js 18+. MySQL binaries are not in git (255 MB): extract the **MySQL 8.4 Windows ZIP** so that `.mysql\mysql-8.4.3-winx64\bin\mysqld.exe` exists. Data lives in `.mysql\data`, port **3308**, no service.

```bash
setup-mysql.cmd                          # once
start-mysql.cmd                          # keep open
cd backend && npm install && copy .env.example .env     # then edit JWT_SECRET
npm run db:setup                         # schema + demo data
npm start                                # API  http://localhost:5000
cd ../frontend && npm install && npm run dev            # UI   http://localhost:5191
```
`start-all.cmd` launches all three after the one-time steps.

### Email (Gmail app password)
1. Turn on 2-Step Verification for the Gmail account, then create an **App password** (Google Account > Security).
2. Put them in `backend/.env`: `EMAIL_USER=you@gmail.com` and `EMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx`. The file is git-ignored; credentials are never stored in the database.
3. Restart the API, open **Admin > Mail center**, press *Verify login*, then *Send test*.
Messages are queued in `email_logs` and sent in the background with 3 attempts. Without credentials they are logged as `skipped`. Seed accounts use the reserved `@anka.test` domain, so demo data can never email real people; edit a student's email to your own address to test delivery.

### Demo logins (seed data only)
| Role | Email | Password |
|---|---|---|
| Admin | admin@anka.test | Admin@123 |
| Teacher | teacher1@anka.test (to teacher8) | Teacher@123 |
| Student | student@anka.test | Student@123 |

## Tests
Three layers, all runnable locally:

```bash
# 1. unit tests: grading, ranking, algorithms, and the email pipeline against a local SMTP server
cd backend && npm test

# 2. API flow tests: ~50 flows over every endpoint, a 59-endpoint x 4-role permission matrix, CRUD,
#    teacher marks/attendance/CSV import, publish/lock/promote, public pages, grading and ranking integrity
npm run db:setup                      # fresh seed
EMAIL_USER=" " EMAIL_APP_PASSWORD=" " node server.js     # API with email disabled (PowerShell: $env:EMAIL_USER=' ')
node tests/flows.mjs && node tests/smoke.mjs

node tests/classroom.mjs               # timetable, diary and assignment flows

# 3. browser end-to-end (real Edge/Chrome via puppeteer-core): every public, admin, teacher and student page,
#    forms, dialogs, keyboard shortcuts, responsive widths, dark theme
cd ../frontend && npm run build && npx vite preview &      # serves the build on :5191, proxying /api
cd ../e2e && npm install && npm test   # start the API with PUBLIC_RATE_LIMIT=5000 for test runs
```
The flow and browser suites refuse to run if email is configured, so a test run can never send real mail. The mailer also never delivers to reserved demo domains (`.test`, `.invalid`, `example.*`), so seeded addresses are safe even with email on. Run them on a freshly seeded database.

## Layout
```
backend/   server.js, routes/ (auth, admin, teacher, classroom, results), utils/ (grading, ranking, algorithms, insights, mailer, resultService), db/, tests/
frontend/  src/pages (public, student, teacher, admin), components (Shell, CommandPalette, Marksheet, Scenes, Logo, ui), styles.css
.mysql/    portable MySQL (git-ignored)
```

## Notes
* Subject codes, credits and grade scales follow the TU and NEB schemes as best known; admins can edit programs and subjects without code changes.
* The seeded names and marks are fictional apart from one account created with the author's own details.

## Documentation
The `Documentation/` folder holds the TU Project III deliverables: `Anka_Project_Report.docx/.pdf` (about 50 pages in the TU format), `Anka_Project_Proposal.docx/.pdf` (15 pages) and `Anka_Defense_Presentation.pptx/.pdf` (10 slides), with their figures, screenshots and generator scripts (`Documentation/build`). Supervisor, examiner and date fields are highlighted placeholders to fill in.
