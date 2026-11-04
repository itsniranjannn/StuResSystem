import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GraduationCap, Users, BookOpen, FileCheck2, Send, UserPlus, Mail, CalendarCheck, ArrowRight, Check, AlertTriangle, Activity } from 'lucide-react';
import { Chip, Empty, Meter, Seg, Spinner, Tile, termName, useLoad, useToast } from '../../components/ui.jsx';
import { get, patch, errMsg } from '../../lib/api';
import { chartTip } from '../student/Home.jsx';

const PIE = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--amber)', 'var(--violet)', 'var(--sky)', 'var(--good)', 'var(--crimson)', 'var(--muted)'];
const ago = (d) => { const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span className="mono">{t.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}

export default function AdminDashboard() {
  const toast = useToast();
  const nav = useNavigate();
  const [pid, setPid] = useState('');
  const [metric, setMetric] = useState('avg_gpa');
  const [hover, setHover] = useState(null);
  const progs = useLoad(() => get('/admin/programs'), []);
  const { data, loading } = useLoad(() => get('/admin/dashboard', { program_id: pid || undefined }), [pid]);
  const teachers = useLoad(() => get('/admin/teachers'), []);
  const batches = useLoad(() => get('/admin/results/batches', { program_id: pid || undefined }), [pid]);
  if (loading || !data) return <Spinner />;
  const { counts: c, perTerm, gradeDist, topSubjects, recent, mail } = data;
  const list = progs.data?.programs || [];
  const pending = (teachers.data?.teachers || []).filter((t) => !t.is_active);
  const drafts = (batches.data?.batches || []).filter((b) => b.published_count < b.students - b.incomplete).slice(0, 4);
  const series = perTerm.map((t) => ({ term: `T${t.semester}`, avg_gpa: Number(t.avg_gpa), pass_rate: t.students ? Math.round((t.passed / t.students) * 100) : 0, students: t.students }));
  const spark = (k) => series.map((s) => s[k]);
  const approve = async (t) => { try { await patch(`/admin/users/${t.user_id}/active`, { is_active: true }); toast(`${t.teacher_name} approved and notified`); teachers.reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const total = gradeDist.reduce((a, g) => a + g.count, 0);
  const sel = hover != null ? gradeDist[hover] : null;
  const steps = [['Programs and grading rules', list.length > 0, '/admin/programs'], ['Subjects for each term', c.subjects > 0, '/admin/subjects'], ['Teachers approved', c.teachers > 0 && c.pending_teachers === 0, '/admin/teachers'], ['Students registered', c.students > 0, '/admin/students'], ['Results calculated', c.draft_results + c.published_results > 0, '/admin/results'], ['Email connected', mail.configured, '/admin/mail']];
  const done = steps.filter((s) => s[1]).length;
  const metricLabel = { avg_gpa: 'Average GPA', pass_rate: 'Pass rate (%)', students: 'Students assessed' }[metric];

  return (
    <>
      <motion.div className="card glow" style={{ marginBottom: 16, padding: 26 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="lbl"><Clock /></div>
            <h1 className="display" style={{ fontSize: 'clamp(1.5rem,2.6vw,2.2rem)', margin: '8px 0 6px' }}>{greet()}, <span className="sun-text">admin.</span></h1>
            <p className="muted" style={{ maxWidth: 520 }}>{drafts.length ? `${drafts.length} result batch${drafts.length > 1 ? 'es are' : ' is'} ready to review.` : 'All results are published.'} {pending.length ? `${pending.length} teacher${pending.length > 1 ? 's are' : ' is'} waiting for approval.` : 'No approvals pending.'}</p>
          </div>
          <div className="row">
            <button className="btn" onClick={() => nav('/admin/results')}><Send size={16} /> Publish results</button>
            <button className="btn paper" onClick={() => nav('/admin/students')}><UserPlus size={16} /> Add student</button>
            <button className="btn paper" onClick={() => nav('/admin/mail')}><Mail size={16} /> Mail center</button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 18, gap: 8 }}>
          <span className="lbl" style={{ marginRight: 4 }}>Viewing</span>
          {[{ id: '', name: 'All programs' }, ...list.map((p) => ({ id: String(p.id), name: p.code }))].map((p) => (
            <motion.button key={p.id} whileTap={{ scale: 0.94 }} className={`chip ${String(pid) === p.id ? 'brand' : ''}`} style={{ cursor: 'pointer', border: 'none', padding: '6px 14px', fontSize: '0.78rem', outline: String(pid) === p.id ? '1px solid var(--brand)' : 'none' }} onClick={() => setPid(p.id)} aria-pressed={String(pid) === p.id}>{p.name}</motion.button>
          ))}
        </div>
      </motion.div>

      <div className="bento">
        <div className="span-3"><Tile label="Students" value={c.students} icon={GraduationCap} color="var(--s1)" spark={spark('students')} hint="across assessed terms" /></div>
        <div className="span-3"><Tile label="Teachers" value={c.teachers} icon={Users} color="var(--s2)" delay={0.05} hint={c.pending_teachers ? `${c.pending_teachers} awaiting approval` : 'all approved'} /></div>
        <div className="span-3"><Tile label="Subjects" value={c.subjects} icon={BookOpen} color="var(--s3)" delay={0.1} hint="in the syllabus" /></div>
        <div className="span-3"><Tile label="Published results" value={c.published_results} icon={FileCheck2} color="var(--s4)" delay={0.15} hint={`${c.draft_results} drafts`} spark={spark('avg_gpa')} /></div>

        <div className="span-8 card">
          <div className="row between" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>{metricLabel} by term</h3>
            <Seg value={metric} onChange={setMetric} label="Metric" options={[{ value: 'avg_gpa', label: 'GPA' }, { value: 'pass_rate', label: 'Pass rate' }, { value: 'students', label: 'Students' }]} />
          </div>
          <p className="sub" style={{ margin: '0 0 10px' }}>Hover to inspect a term. Switch the metric above.</p>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={series} margin={{ left: -14, right: 6, top: 8 }}>
              <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--s1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--s1)" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="term" stroke="var(--muted)" tickLine={false} axisLine={false} /><YAxis stroke="var(--muted)" tickLine={false} axisLine={false} domain={metric === 'avg_gpa' ? [0, 4] : metric === 'pass_rate' ? [0, 100] : [0, 'auto']} />
              <Tooltip contentStyle={chartTip} cursor={{ stroke: 'var(--line-strong)' }} />
              <Area key={metric} type="monotone" dataKey={metric} stroke="var(--s1)" strokeWidth={3} fill="url(#ga)" dot={{ r: 4, fill: 'var(--s1)', stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 7 }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="span-4 card">
          <div className="row between"><h3 style={{ margin: 0 }}>Needs attention</h3><Chip kind={pending.length + drafts.length + c.mail_failed ? 'warn' : 'pass'}>{pending.length + drafts.length + c.mail_failed || 'clear'}</Chip></div>
          <div className="stack" style={{ marginTop: 14 }}>
            <AnimatePresence initial={false}>
              {pending.map((t) => (
                <motion.div key={`t${t.id}`} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="row between" style={{ flexWrap: 'nowrap' }}>
                  <div style={{ minWidth: 0 }}><b style={{ display: 'block' }}>{t.teacher_name}</b><span className="muted small">wants teacher access</span></div>
                  <button className="btn good sm" onClick={() => approve(t)}><Check size={14} /> Approve</button>
                </motion.div>
              ))}
            </AnimatePresence>
            {drafts.map((b) => (
              <Link key={`${b.program_id}-${b.semester}-${b.exam_year}`} to="/admin/results" className="row between" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'nowrap' }}>
                <div><b style={{ display: 'block' }}>{b.program} {termName(b, b.semester)} · {b.exam_year}</b><span className="muted small">{b.students - b.incomplete} results in draft</span></div><ArrowRight size={16} color="var(--brand)" />
              </Link>
            ))}
            {c.mail_failed > 0 && <Link to="/admin/mail" className="row" style={{ textDecoration: 'none', color: 'var(--bad)' }}><AlertTriangle size={16} /> {c.mail_failed} email(s) failed to send</Link>}
            {!pending.length && !drafts.length && !c.mail_failed && <Empty title="All clear">Nothing needs your attention right now.</Empty>}
          </div>
        </div>

        <div className="span-4 card">
          <h3>Grade distribution</h3>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gradeDist} dataKey="count" nameKey="grade" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="var(--surface)" strokeWidth={2} onMouseLeave={() => setHover(null)} animationDuration={900}>
                  {gradeDist.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} opacity={hover == null || hover === i ? 1 : 0.28} style={{ cursor: 'pointer', transition: 'opacity .2s' }} onMouseEnter={() => setHover(i)} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
              <div><div className="display" style={{ fontSize: '1.7rem' }}>{sel ? sel.count : total}</div><div className="muted small">{sel ? `grade ${sel.grade} · ${Math.round((sel.count / total) * 100)}%` : 'results'}</div></div>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>{gradeDist.map((g, i) => <span key={g.grade} className="chip" style={{ opacity: hover == null || hover === i ? 1 : 0.4, cursor: 'pointer' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><i style={{ width: 8, height: 8, borderRadius: 4, background: PIE[i % PIE.length] }} />{g.grade}</span>)}</div>
        </div>

        <div className="span-4 card">
          <h3>Pass and fail by term</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={perTerm.map((t) => ({ term: `T${t.semester}`, Passed: Number(t.passed), Failed: Number(t.failed) }))} margin={{ left: -18 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="term" stroke="var(--muted)" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="var(--muted)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTip} cursor={{ fill: 'var(--surface-2)' }} />
              <Bar dataKey="Passed" stackId="a" fill="var(--s2)" /><Bar dataKey="Failed" stackId="a" fill="var(--s4)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="span-4 card">
          <div className="row between"><h3 style={{ margin: 0 }}>Getting started</h3><Chip kind={done === steps.length ? 'pass' : 'warn'}>{done}/{steps.length}</Chip></div>
          <div style={{ margin: '12px 0' }}><Meter value={done} max={steps.length} /></div>
          <ul className="steps small">{steps.map(([t, ok, to]) => <li key={t} className={ok ? 'done' : ''}><Link to={to} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 650, flex: 1 }}>{t}</Link></li>)}</ul>
        </div>

        <div className="span-6 card">
          <div className="row between"><h3 style={{ margin: 0 }}>Strongest subjects</h3><Chip kind="info"><CalendarCheck size={13} /> attendance {data.avg_attendance ?? '-'}%</Chip></div>
          <div className="stack" style={{ marginTop: 14 }}>
            {topSubjects.map((s, i) => (
              <div key={s.code}><div className="row between small"><span><span className="mono muted">{s.code}</span> {s.name}</span><b className="mono">{s.avg_percent}%</b></div><Meter value={s.avg_percent} color={PIE[i % 4]} /></div>
            ))}
          </div>
        </div>

        <div className="span-6 card">
          <div className="row between"><h3 style={{ margin: 0 }}>Live activity</h3><Link to="/admin/audit" className="small">Full log</Link></div>
          <div className="feed" style={{ marginTop: 14 }}>
            {recent.slice(0, 6).map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="row between small"><span><Chip kind="info">{r.action.replace(/_/g, ' ').toLowerCase()}</Chip> <span className="muted">{r.user_name}</span></span><span className="mono muted">{ago(r.created_at)}</span></div>
                <div className="muted small" style={{ marginTop: 2 }}>{r.detail}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr"><Activity /></span>
    </>
  );
}
