import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Trophy, BarChart3, ShieldCheck, Mail, CalendarCheck, Layers, ArrowRight, PenLine, Send, BellRing, Plus, X, GraduationCap, Check } from 'lucide-react';
import { HeroScene } from '../components/Scenes.jsx';
import { Logo } from '../components/Logo.jsx';
import { ThemeButton } from '../components/Shell.jsx';
import { Counter, Ring, Seg, useLoad } from '../components/ui.jsx';
import { get } from '../lib/api';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { useInstitution } from '../lib/institution.jsx';

const BEFORE = ['Results take weeks and sit in paper ledgers', 'A hand-written marksheet can be forged', 'Failing students are noticed after the exam', 'Parents learn the result from the notice board', 'Each program needs its own spreadsheet and grading rule', 'Attendance is guessed when exams approach'];
const AFTER = ['Marks entered once, ranked and published in a click', 'Every marksheet carries a QR and a code anyone can verify', 'Early-warning scores flag risk before the exam', 'Student and guardian are emailed when you publish', 'GPA, grade-point and division grading in one engine', 'The attendance rule tracked live, per subject'];
const FEATURES = [
  [Layers, 'Any institution, any level', 'School, higher secondary, bachelor or master. Programs, terms and grading rules are configured, not coded.', 'span-5'],
  [Trophy, 'Fair automatic ranking', 'Merge-sort merit lists with proper tie handling, toppers by min-heap, a percentile for every student.', 'span-7'],
  [BarChart3, 'Insights that lead to action', 'Regression GPA forecast, k-means performance groups, internal versus external correlation.', 'span-7'],
  [Mail, 'Email that reaches home', 'Result, risk and notice emails through your own Gmail account, queued and retried.', 'span-5'],
  [CalendarCheck, 'Attendance in two taps', 'Everyone starts present. Mark only the exceptions.', 'span-4'],
  [ShieldCheck, 'Locked and auditable', 'Role-based access, hashed passwords, locked published marks, full audit log.', 'span-4'],
  [GraduationCap, 'Transcripts and backlogs', 'Cumulative CGPA, final division and the subjects still to clear.', 'span-4'],
];
const FLOW = [[PenLine, 'Teachers enter marks', 'Type them in or import a CSV from Excel. GPAs and ranks recalculate on every save.'], [Send, 'Administration publishes', 'Review the batch, publish it and promote passed students. Nothing is visible before this step.'], [BellRing, 'Everyone is informed', 'Students and guardians receive an email. Anyone can look up or verify a result by symbol number.']];

// Client copy of the grading scales (the server holds the authoritative copy) so visitors can try the engine.
const SCALES = {
  tu_gpa: [[90, 'A', 4.0], [80, 'A-', 3.7], [75, 'B+', 3.3], [70, 'B', 3.0], [65, 'B-', 2.7], [60, 'C+', 2.3], [55, 'C', 2.0], [50, 'C-', 1.7], [45, 'D+', 1.3], [40, 'D', 1.0], [0, 'F', 0]],
  neb_gpa: [[90, 'A+', 4.0], [80, 'A', 3.6], [70, 'B+', 3.2], [60, 'B', 2.8], [50, 'C+', 2.4], [40, 'C', 2.0], [35, 'D', 1.6], [0, 'NG', 0]],
  division: [[80, 'Distinction', null], [60, 'First', null], [48, 'Second', null], [40, 'Pass', null], [0, 'Fail', 0]],
};
const grade = (pct, scheme) => SCALES[scheme].find((b) => pct >= b[0]);

function Calculator() {
  const [scheme, setScheme] = useState('tu_gpa');
  const [rows, setRows] = useState([{ n: 'Subject one', p: 82, c: 3 }, { n: 'Subject two', p: 74, c: 3 }, { n: 'Subject three', p: 91, c: 3 }, { n: 'Subject four', p: 58, c: 3 }]);
  const pass = scheme === 'neb_gpa' ? 35 : 40;
  const calc = useMemo(() => {
    const subs = rows.map((r) => { const v = Number(r.p) || 0; const g = grade(v, scheme); const ok = v >= pass; return { ...r, g: ok ? g : SCALES[scheme][SCALES[scheme].length - 1], ok, pt: scheme === 'division' ? (ok ? (v / 100) * 4 : 0) : ok ? g[2] : 0 }; });
    const cr = subs.reduce((a, s) => a + Number(s.c || 0), 0);
    const gpa = cr ? subs.reduce((a, s) => a + s.pt * Number(s.c || 0), 0) / cr : 0;
    const avg = cr ? subs.reduce((a, s) => a + (Number(s.p) || 0) * Number(s.c || 0), 0) / cr : 0;
    return { subs, gpa, avg, passed: subs.every((s) => s.ok), band: grade(avg, scheme) };
  }, [rows, scheme, pass]);
  const set = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="card" style={{ padding: 26 }}>
      <div className="row between" style={{ marginBottom: 18 }}>
        <Seg value={scheme} onChange={setScheme} label="Grading rule" options={[{ value: 'tu_gpa', label: 'Semester GPA' }, { value: 'neb_gpa', label: 'Grade points' }, { value: 'division', label: 'Divisions' }]} />
        <span className="chip info">pass mark {pass}% per subject</span>
      </div>
      <div className="bento" style={{ alignItems: 'start' }}>
        <div className="span-7">
          <div className="calc-row lbl"><span>Subject</span><span>Marks %</span><span>Credits</span><span /></div>
          {rows.map((r, i) => (
            <motion.div key={i} className="calc-row" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <input className="input" value={r.n} onChange={(e) => set(i, 'n', e.target.value)} aria-label={`Subject ${i + 1} name`} />
              <input className="input mono" type="number" min="0" max="100" value={r.p} onChange={(e) => set(i, 'p', Math.min(100, Math.max(0, e.target.value)))} aria-label={`${r.n} marks percent`} />
              <input className="input mono" type="number" min="1" max="6" value={r.c} onChange={(e) => set(i, 'c', e.target.value)} aria-label={`${r.n} credits`} />
              <button className="btn ghost icon sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${r.n}`} disabled={rows.length < 2}><X size={14} /></button>
            </motion.div>
          ))}
          <button className="btn paper sm" onClick={() => setRows((x) => [...x, { n: `Subject ${x.length + 1}`, p: 70, c: 3 }])} disabled={rows.length >= 8}><Plus size={14} /> Add subject</button>
        </div>
        <div className="span-5 row" style={{ gap: 22, justifyContent: 'center', flexWrap: 'nowrap' }}>
          <Ring value={calc.gpa} max={4} size={148} stroke={10}>
            <div className="display" style={{ fontSize: '1.8rem' }}>{calc.gpa.toFixed(2)}</div><div className="muted small">{scheme === 'division' ? 'GPA equivalent' : 'semester GPA'}</div>
          </Ring>
          <div className="stack" style={{ minWidth: 120 }}>
            <span className={`chip ${calc.passed ? 'pass' : 'fail'}`}>{calc.passed ? 'Passed' : 'Reappear'}</span>
            <div><div className="lbl">{scheme === 'division' ? 'Division' : 'Overall grade'}</div><div className="display" style={{ fontSize: '1.25rem' }}>{calc.passed ? calc.band[1] : '-'}</div></div>
            <div><div className="lbl">Weighted %</div><div className="mono">{calc.avg.toFixed(1)}%</div></div>
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 16, gap: 6 }}>{calc.subs.map((s, i) => <span key={i} className={`chip ${s.ok ? 'info' : 'fail'}`}>{s.n.slice(0, 16)}: {s.g[1]}</span>)}</div>
    </div>
  );
}

export default function Landing() {
  const [roll, setRoll] = useState('');
  const nav = useNavigate();
  const { user } = useAuth();
  const { inst } = useInstitution();
  const { data } = useLoad(() => get('/results/public/stats'), []);
  const s = data?.stats;
  const go = (e) => { e.preventDefault(); if (roll.trim()) nav(`/result?roll=${encodeURIComponent(roll.trim())}`); };
  return (
    <>
      <nav className="pub-nav" aria-label="Main">
        <div className="pub-nav-in">
          <Link to="/" style={{ textDecoration: 'none' }}><Logo size={34} /></Link>
          <div className="pub-links">
            <a href="#how">How it works</a><a href="#try">Grading engine</a><a href="#features">Features</a><Link to="/gpa">GPA checker</Link><Link to="/verify">Verify marksheet</Link><Link to="/algorithms">Algorithms</Link>
          </div>
          <div className="row"><ThemeButton />
            {user ? <Link className="btn" to={homeFor(user.role)}>Open portal <ArrowRight size={15} /></Link> : <><Link className="btn paper" to="/login">Sign in</Link><Link className="btn" to="/register">Get started</Link></>}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div>
          <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><b>{inst.name || 'Result system'}</b><span className="muted">· for schools, colleges and universities</span></motion.span>
          <motion.h1 style={{ marginTop: 18 }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            Results your whole institution can <span className="sun-text">trust.</span>
          </motion.h1>
          <motion.p className="lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            Anka turns raw marks into published results, fair merit lists, attendance tracking and early-warning insights. One system for a school, a higher secondary college or a university campus.
          </motion.p>
          <motion.form onSubmit={go} className="search-bar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <input className="input" placeholder="Look up a result by symbol number" value={roll} onChange={(e) => setRoll(e.target.value)} aria-label="Symbol number" />
            <button className="btn lg" type="submit"><Search size={16} /> Check result</button>
          </motion.form>
          <div className="row" style={{ marginTop: 36, gap: 40 }}>
            {s && [['Students', s.students], ['Programs', s.programs], ['Subjects', s.subjects], ['Published results', s.results]].map(([l, v]) => (
              <div key={l}><div className="display" style={{ fontSize: '1.7rem', lineHeight: 1 }}><Counter value={v} /></div><div className="muted small" style={{ marginTop: 6 }}>{l}</div></div>
            ))}
          </div>
        </div>
        <div className="stage">
          <HeroScene />
          <div className="float-card" style={{ left: 16, bottom: 16, width: 232 }}>
            <div className="lbl">Sample result</div>
            <div className="row between" style={{ marginTop: 4 }}><span className="display" style={{ fontSize: '1.4rem' }}>GPA 3.82</span><span className="chip pass">Passed</span></div>
            <div className="row small" style={{ marginTop: 6, gap: 6, color: 'var(--ink-2)' }}><Trophy size={13} /> Rank 2 of 14 <ShieldCheck size={13} style={{ marginLeft: 6, color: 'var(--good)' }} /> verifiable</div>
          </div>
        </div>
      </header>

      <section className="section" id="how">
        <div className="crumb">How it works</div>
        <h2 style={{ marginBottom: 24 }}>From marks to message in three steps</h2>
        <div className="flow">
          {FLOW.map(([Icon, t1, d], i) => (
            <motion.div key={t1} className="card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div className="row between" style={{ marginBottom: 16 }}><span className="step-n">{i + 1}</span><Icon size={20} color="var(--muted)" /></div>
              <h3 style={{ fontSize: '1.08rem', marginBottom: 6 }}>{t1}</h3><p className="muted small">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section" id="try" style={{ paddingTop: 20 }}>
        <div className="crumb">Grading engine</div>
        <h2>Try it with your own numbers</h2>
        <p className="muted" style={{ margin: '4px 0 24px', maxWidth: 580 }}>Change a mark, a credit or the grading rule. This is the same credit-weighted GPA, pass rule and grade bands applied to every real result.</p>
        <Calculator />
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="crumb">The problem we remove</div>
        <h2 style={{ marginBottom: 24 }}>What changes for an education office</h2>
        <div className="compare">
          <div className="col"><h4>Today in many offices</h4><ul>{BEFORE.map((x) => <li key={x}><X size={16} color="var(--bad)" style={{ flexShrink: 0, marginTop: 3 }} />{x}</li>)}</ul></div>
          <div className="col"><h4>With Anka</h4><ul>{AFTER.map((x) => <li key={x}><Check size={16} color="var(--good)" style={{ flexShrink: 0, marginTop: 3 }} />{x}</li>)}</ul></div>
        </div>
      </section>

      <section className="section" id="features" style={{ paddingTop: 20 }}>
        <div className="crumb">Capabilities</div>
        <h2 style={{ marginBottom: 24 }}>Built to run a real institution</h2>
        <div className="bento">
          {FEATURES.map(([Icon, title, d, span], i) => (
            <motion.div key={title} className={span} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }}>
              <div className="card lift feature" style={{ height: '100%' }}><div className="fi"><Icon size={20} /></div><h3>{title}</h3><p className="muted small">{d}</p></div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="cta-band">
          <h2 style={{ color: '#fff', maxWidth: 540 }}>Publish your next result with confidence.</h2>
          <p style={{ opacity: 0.8, margin: '10px 0 24px', maxWidth: 480 }}>Sign in to the portal, or look up a result by symbol number without an account.</p>
          <div className="row">
            <Link to="/login" className="btn lg" style={{ background: '#fff', color: '#0f1f3f' }}>Sign in <ArrowRight size={16} /></Link>
            <Link to="/register" className="btn lg" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', boxShadow: 'none' }}>Create account</Link>
            <Link to="/verify" className="btn lg" style={{ background: 'transparent', color: '#fff', boxShadow: 'none', border: '1px solid rgba(255,255,255,.35)' }}><ShieldCheck size={15} /> Verify a marksheet</Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-in">
          <div className="fcols">
            <div><Logo size={32} animated={false} /><p className="muted small" style={{ margin: '16px 0 6px', maxWidth: 320 }}>Result processing, ranking, attendance and early-warning insights for schools, colleges and campuses.</p>
              {inst.name && <div className="small"><b>{inst.name}</b>{inst.address && <div className="muted">{inst.address}</div>}{inst.email && <div className="muted">{inst.email}</div>}{inst.phone && <div className="muted">{inst.phone}</div>}</div>}</div>
            <div><h5>Product</h5><a href="#how">How it works</a><a href="#try">Grading engine</a><a href="#features">Capabilities</a><Link to="/algorithms">Algorithms</Link></div>
            <div><h5>Portals</h5><Link to="/login">Administration</Link><Link to="/login">Teachers</Link><Link to="/login">Students</Link><Link to="/register">Create account</Link></div>
            <div><h5>Public tools</h5><Link to="/gpa">GPA checker with back papers</Link><Link to="/result">Check a result</Link><Link to="/verify">Verify a marksheet</Link><Link to="/forgot">Reset password</Link></div>
          </div>
          <div className="fbottom"><span>© {new Date().getFullYear()} {inst.name || 'Anka'}</span><span>Grading scales are configurable. Confirm them against your board or university rules.</span></div>
        </div>
      </footer>
    </>
  );
}
