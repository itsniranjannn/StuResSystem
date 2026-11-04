// Creates the schema and seeds demo data in the project-local MySQL.  Usage: npm run db:setup
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { settings, DB_NAME } = require('../config/db');
const { programs, curricula } = require('./syllabus');
const { examYear } = require('../utils/terms');
const { evaluateSubject } = require('../utils/grading');

// Deterministic RNG so the demo data is identical on every machine.
let seed = 20261102;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const DOMAIN = 'anka.test'; // reserved TLD: demo addresses can never receive real mail

const FIRST_M = ['Aarav', 'Bibek', 'Suman', 'Prakash', 'Rohan', 'Sagar', 'Nabin', 'Kiran', 'Anil', 'Dipesh', 'Sujan', 'Pawan', 'Roshan', 'Ashish', 'Manish', 'Bishal'];
const FIRST_F = ['Anjali', 'Sita', 'Priya', 'Sabina', 'Nisha', 'Rima', 'Puja', 'Sunita', 'Kritika', 'Barsha', 'Samikshya', 'Rojina', 'Binita', 'Alisha', 'Mina', 'Sristi'];
const LAST = ['Sharma', 'Adhikari', 'Gurung', 'Thapa', 'Karki', 'Shrestha', 'Poudel', 'Bhandari', 'Rai', 'Tamang', 'Basnet', 'Khadka', 'Acharya', 'Magar', 'Dahal', 'Pandey'];
const PLACES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavre', 'Chitwan', 'Pokhara', 'Dhading', 'Nuwakot', 'Sindhupalchok', 'Makwanpur'];

const COHORTS = [
  { prog: 'BCA', batch: 2022, term: 8, n: 14 }, { prog: 'BCA', batch: 2023, term: 6, n: 14 }, { prog: 'BCA', batch: 2024, term: 4, n: 12 }, { prog: 'BCA', batch: 2025, term: 2, n: 12 },
  { prog: 'BBS', batch: 2023, term: 3, n: 10 }, { prog: 'BBS', batch: 2025, term: 1, n: 10 },
  { prog: 'SCI', batch: 2024, term: 2, n: 12 }, { prog: 'SCI', batch: 2025, term: 1, n: 12 },
];
const TEACHERS = [
  ['Ram Prasad Neupane', 'MSc CSIT', 'Computer Science', ['BCA']], ['Sarita Koirala', 'MCA', 'Computer Science', ['BCA']],
  ['Dr. Hari Bhattarai', 'PhD Computer Science', 'Computer Science', ['BCA']], ['Mina Rijal', 'M.Sc. IT', 'Computer Science', ['BCA']],
  ['Deepak Subedi', 'MBS, MBA', 'Management', ['BBS']], ['Gita Lamichhane', 'M.Phil. Economics', 'Management', ['BBS']],
  ['Bishnu Prasad Ghimire', 'M.Sc. Physics', 'Science', ['SCI']], ['Kabita Dhakal', 'M.Sc. Chemistry', 'Science', ['SCI']],
];

async function main() {
  const conn = await mysql.createConnection({ ...settings, multipleStatements: true });
  console.log('Creating schema ...');
  await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8').split('student_result_system').join(DB_NAME));
  await conn.changeUser({ database: DB_NAME });
  const ins = async (sql, p) => (await conn.query(sql, p))[0].insertId;
  const hAdmin = bcrypt.hashSync('Admin@123', 10);
  const hTeacher = bcrypt.hashSync('Teacher@123', 10);
  const hStudent = bcrypt.hashSync('Student@123', 10);

  const progId = {};
  const progRow = {};
  for (const p of programs) {
    progId[p.code] = await ins('INSERT INTO programs (code,name,level,grading_scheme,term_label,term_count,term_offset,terms_per_year,pass_percent,attendance_required) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [p.code, p.name, p.level, p.grading_scheme, p.term_label, p.term_count, p.term_offset, p.terms_per_year, p.pass_percent, p.attendance_required]);
    progRow[p.code] = p;
  }
  await ins('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['System Administrator', `admin@${DOMAIN}`, hAdmin, 'admin']);

  const teachersByProg = { BCA: [], BBS: [], SCI: [] };
  for (let i = 0; i < TEACHERS.length; i++) {
    const [name, qual, dept, progs] = TEACHERS[i];
    const uid = await ins('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [name, `teacher${i + 1}@${DOMAIN}`, hTeacher, 'teacher']);
    const tid = await ins('INSERT INTO teachers (user_id,teacher_name,department,qualification,phone) VALUES (?,?,?,?,?)', [uid, name, dept, qual, `98410${10000 + i * 137}`]);
    progs.forEach((p) => teachersByProg[p].push(tid));
  }

  const subjects = [];
  for (const [code, curriculum] of Object.entries(curricula)) {
    let rr = 0;
    for (const [term, list] of Object.entries(curriculum)) {
      for (const [scode, name, credit, type, inF, exF] of list) {
        const tl = teachersByProg[code];
        const teacher = tl[rr++ % tl.length];
        const id = await ins('INSERT INTO subjects (program_id,code,name,semester,credit,type,internal_full,external_full,teacher_id) VALUES (?,?,?,?,?,?,?,?,?)',
          [progId[code], scode, name, Number(term), credit, type, inF, exF, teacher]);
        subjects.push({ id, prog: code, term: Number(term), internal_full: inF, external_full: exF, teacher });
      }
    }
  }

  const students = [];
  let serial = 0;
  for (const c of COHORTS) {
    for (let k = 0; k < c.n; k++) {
      serial++;
      const female = rnd() < 0.45;
      let name = `${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
      let email = `student${serial}@${DOMAIN}`;
      let roll = `${c.prog === 'BCA' ? '' : c.prog + '-'}${String(c.batch % 100)}${String(2780000 + serial * 37).padStart(7, '0')}`;
      let reg = `6-2-278-${serial}-${c.batch}`;
      if (c.prog === 'BCA' && c.batch === 2022 && k === 0) { name = 'Niranjan Katwal'; email = `student@${DOMAIN}`; roll = '27802063'; reg = '6-2-278-18-2022'; }
      const uid = await ins('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [name, email, hStudent, 'student']);
      const sid = await ins(
        `INSERT INTO students (user_id,program_id,roll_no,reg_no,student_name,semester,batch,gender,father_name,address,phone,dob) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid, progId[c.prog], roll, reg, name, c.term, c.batch, female ? 'female' : 'male', `${pick(FIRST_M)} ${name.split(' ')[1]}`, pick(PLACES), `98${Math.floor(10000000 + rnd() * 89999999)}`, `${c.batch - 19 + Math.floor(rnd() * 2)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`]);
      // ~12% of students struggle (low ability) so the early-warning features have real cases.
      const struggling = !(c.prog === 'BCA' && c.batch === 2022 && k === 0) && rnd() < 0.12;
      students.push({ id: sid, ...c, ability: struggling ? 0.3 + rnd() * 0.12 : 0.6 + rnd() * 0.34, struggling, attProp: struggling ? 0.55 + rnd() * 0.2 : rnd() < 0.15 ? 0.7 + rnd() * 0.1 : 0.86 + rnd() * 0.12 });
    }
  }

  const markRows = [];
  for (const st of students) {
    const tpy = progRow[st.prog].terms_per_year;
    for (const sub of subjects.filter((s) => s.prog === st.prog && s.term <= st.term)) {
      const noise = (rnd() - 0.5) * 0.26;
      const frac = Math.min(0.98, Math.max(0.15, st.ability + noise));
      const internal = Math.round(sub.internal_full * Math.min(0.98, Math.max(0.3, frac + 0.06)) * 2) / 2;
      const external = sub.external_full ? Math.round(sub.external_full * frac * 2) / 2 : 0;
      markRows.push([st.id, sub.id, examYear(st.batch, sub.term, tpy), internal, external]);
    }
  }
  for (let i = 0; i < markRows.length; i += 500) await conn.query('INSERT INTO marks (student_id,subject_id,exam_year,internal_marks,external_marks) VALUES ?', [markRows.slice(i, i + 500)]);

  // Back papers: most students who failed a subject in a completed term re-sat it a year later; some cleared it, some did not.
  const subjById = new Map(subjects.map((x) => [x.id, x]));
  const stById = new Map(students.map((x) => [x.id, x]));
  const bpRows = [];
  for (const [sid, subId, year, internal, external] of markRows) {
    const sub = subjById.get(subId); const st = stById.get(sid);
    if (sub.term >= st.term || year + 1 > 2026) continue;           // only completed terms
    const pr = progRow[st.prog];
    const ev = evaluateSubject({ internal_marks: internal, external_marks: external, internal_full: sub.internal_full, external_full: sub.external_full, credit: 1 }, pr.grading_scheme, pr.pass_percent);
    if (ev.passed || rnd() < 0.15) continue;                          // passed first time, or never re-sat
    const frac = rnd() < 0.75 ? 0.55 + rnd() * 0.25 : 0.25 + rnd() * 0.1; // 75% clear it, the rest fail again
    bpRows.push([sid, subId, year + 1, 2, Math.round(sub.internal_full * Math.min(0.95, frac + 0.05) * 2) / 2, sub.external_full ? Math.round(sub.external_full * frac * 2) / 2 : 0]);
  }
  for (let i = 0; i < bpRows.length; i += 500) await conn.query('INSERT INTO marks (student_id,subject_id,exam_year,attempt,internal_marks,external_marks) VALUES ?', [bpRows.slice(i, i + 500)]);

  // Attendance for the current term: 24 recent class days (Sunday-Friday, Saturday is the weekly holiday in Nepal).
  const days = [];
  for (let d = new Date(); days.length < 24; d.setDate(d.getDate() - 1)) if (d.getDay() !== 6) days.push(d.toISOString().slice(0, 10));
  const attRows = [];
  for (const st of students) {
    for (const sub of subjects.filter((s) => s.prog === st.prog && s.term === st.term)) {
      for (const day of days) {
        const r = rnd();
        attRows.push([st.id, sub.id, day, r < st.attProp ? (rnd() < 0.06 ? 'late' : 'present') : 'absent']);
      }
    }
  }
  for (let i = 0; i < attRows.length; i += 1000) await conn.query('INSERT INTO attendance (student_id,subject_id,att_date,status) VALUES ?', [attRows.slice(i, i + 1000)]);

  // Weekly timetable for the current term of every program: one period per subject, no teacher or class clashes.
  const periods = [['07:00', '08:00'], ['08:00', '09:00'], ['09:00', '10:00'], ['10:15', '11:15'], ['11:15', '12:15']];
  const busy = new Set(); const ttRows = []; let n = 0; const rooms = ['Room 101', 'Room 102', 'Room 201', 'Lab 1', 'Hall A'];
  const cohorts = [...new Set(students.map((x) => x.prog + ':' + x.term))];
  for (const c of cohorts) {
    const [pc, t] = c.split(':');
    for (const sub of subjects.filter((x) => x.prog === pc && x.term === Number(t))) {
      for (let tries = 0; tries < 40; tries++, n++) {
        const day = n % 6, per = Math.floor(n / 6) % periods.length;
        const kc = c + day + per, kt = 't' + sub.teacher + day + per;
        if (busy.has(kc) || busy.has(kt)) continue;
        busy.add(kc); busy.add(kt);
        ttRows.push([sub.id, day, periods[per][0], periods[per][1], rooms[(n + sub.id) % rooms.length]]);
        n++; break;
      }
    }
  }
  if (ttRows.length) await conn.query('INSERT INTO timetable (subject_id,weekday,start_time,end_time,room) VALUES ?', [ttRows]);

  await conn.query(`INSERT INTO notices (title, body, audience) VALUES
    ('Welcome to Anka', 'Results, attendance and insights now live in one place. Use the public Result Search with your symbol number, or verify a marksheet with its code.', 'all'),
    ('80% attendance rule', 'Students need at least 80% attendance to be eligible for the term-end examination. Check your attendance page regularly.', 'student'),
    ('Marks entry deadline', 'Teachers: please complete internal and external marks entry for the current term before the board meeting. CSV import is available on the Marks page.', 'teacher')`);
  await conn.end();

  // Calculate every term/year, publish all completed terms (current terms stay draft to show the workflow).
  const { calculateResults } = require('../utils/resultService');
  const { pool, query } = require('../config/db');
  const done = new Set();
  for (const st of students) {
    const tpy = progRow[st.prog].terms_per_year;
    for (let t = 1; t <= st.term; t++) {
      const y = examYear(st.batch, t, tpy);
      const key = `${st.prog}-${t}-${y}`;
      if (!done.has(key)) { done.add(key); await calculateResults(progId[st.prog], t, y); }
    }
  }
  for (const c of COHORTS) {
    const tpy = progRow[c.prog].terms_per_year;
    for (let t = 1; t < c.term; t++) {
      await query(`UPDATE results r JOIN students s ON s.id = r.student_id SET r.published=1, r.published_at=NOW() WHERE s.program_id=? AND r.semester=? AND r.exam_year=?`, [progId[c.prog], t, examYear(c.batch, t, tpy)]);
    }
  }
  const [[counts]] = await pool.query('SELECT (SELECT COUNT(*) FROM marks WHERE attempt > 1) backpapers,(SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM students) students,(SELECT COUNT(*) FROM subjects) subjects,(SELECT COUNT(*) FROM marks) marks,(SELECT COUNT(*) FROM attendance) attendance,(SELECT COUNT(*) FROM results) results,(SELECT COUNT(*) FROM results WHERE status="fail") failed');
  console.log('Seeded:', counts);
  await pool.end();
  console.log(`Logins: admin@${DOMAIN} / Admin@123 | teacher1@${DOMAIN} / Teacher@123 | student@${DOMAIN} / Student@123`);
}
main().catch((e) => { console.error(e); process.exit(1); });
