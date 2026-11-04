import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, FileText, Trophy } from 'lucide-react';
import { Chip, Empty, Meter, PageHeader, Ring, Spinner, Tile, firstName, statusKind, useLoad } from '../../components/ui.jsx';
import { get } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';

export const chartTip = { background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--ink)', boxShadow: 'var(--shadow-md)' };
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function StudentHome() {
  const { user } = useAuth();
  const ov = useLoad(() => get('/results/me/overview'), []);
  const an = useLoad(() => get('/results/me/analysis'), []);
  const notes = useLoad(() => get('/results/notices'), []);
  const [sel, setSel] = useState(null);
  const results = ov.data?.results || [];
  const cur = results.find((r) => r.semester === sel) || results[results.length - 1];
  const termSubjects = useMemo(() => (an.data?.subjects || []).filter((s) => s.semester === cur?.semester).map((s) => ({ code: s.code, name: s.name, You: s.percent, Class: s.class_avg })), [an.data, cur]);
  if (ov.loading) return <Spinner />;
  const { cgpa, credits, backlog, pending, attendance, student } = ov.data;
  const tn = (n) => `${student.term_label} ${n + student.term_offset}`;
  const trend = results.map((r) => ({ name: tn(r.semester), gpa: Number(r.gpa), sem: r.semester }));
  const eligible = attendance.overall == null ? null : attendance.overall >= attendance.required;
  const delta = results.length > 1 ? Math.round((Number(results[results.length - 1].gpa) - Number(results[results.length - 2].gpa)) * 100) / 100 : null;

  return (
    <>
      <PageHeader crumb={`${student.program_name} · ${tn(student.semester)}`} title={`${greet()}, ${firstName(user.name)}`} sub={`Symbol number ${user.roll_no}`}>
        <Link to="/student/results" className="btn paper"><FileText size={15} /> My results</Link><Link to="/student/insights" className="btn">Insights <ArrowRight size={15} /></Link>
      </PageHeader>

      <div className="bento">
        <div className="card span-5" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Ring value={cgpa} max={4} size={150} stroke={11}><div className="display" style={{ fontSize: '2rem' }}>{cgpa.toFixed(2)}</div><div className="muted small">CGPA</div></Ring>
          <div className="stack" style={{ flex: 1, minWidth: 150 }}>
            <div><div className="lbl">Credits earned</div><div className="display" style={{ fontSize: '1.4rem' }}>{credits}</div></div>
            <div><div className="lbl">Latest rank</div><div className="display" style={{ fontSize: '1.4rem' }}>{results.length ? `${results[results.length - 1].class_rank}` : '-'}<span className="muted small" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}> {results.length ? `of ${results[results.length - 1].class_size}` : ''}</span></div></div>
            {delta != null && <Chip kind={delta >= 0 ? 'pass' : 'fail'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} GPA vs previous term</Chip>}
          </div>
        </div>

        <div className="span-7 grid-2" style={{ gap: 16 }}>
          <Tile label="Attendance" value={attendance.overall ?? 0} decimals={1} suffix="%" icon={CalendarCheck} color={eligible === false ? 'var(--bad)' : 'var(--good)'} hint={eligible == null ? 'not recorded yet' : eligible ? 'Eligible for the exam' : `Below the ${attendance.required}% rule`} />
          <Tile label="Terms published" value={results.length} icon={Trophy} color="var(--s1)" delay={0.05} hint={pending ? `${pending} awaiting publication` : 'up to date'} />
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="row between"><b>Status</b></div>
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              {backlog > 0 ? <Chip kind="fail"><AlertTriangle size={13} /> {backlog} term(s) with failed subjects</Chip> : <Chip kind="pass"><CheckCircle2 size={13} /> no backlogs</Chip>}
              {eligible === false ? <Chip kind="warn"><AlertTriangle size={13} /> attendance {attendance.overall}% is under {attendance.required}%</Chip> : eligible && <Chip kind="pass"><CheckCircle2 size={13} /> exam eligible</Chip>}
              {pending > 0 && <Chip kind="info">{pending} result(s) awaiting publication</Chip>}
            </div>
            {attendance.overall != null && <div style={{ marginTop: 14 }}><div className="row between small"><span>Attendance</span><span className="mono">{attendance.overall}% / {attendance.required}%</span></div><Meter value={attendance.overall} color={eligible ? 'var(--good)' : 'var(--bad)'} /></div>}
          </div>
        </div>

        {results.length === 0 ? <div className="card span-12"><Empty title="No published results yet">Your results will appear here as soon as the institution publishes them.</Empty></div> : (<>
          <div className="card span-7">
            <div className="row between"><h3 style={{ margin: 0 }}>GPA trend</h3><span className="muted small">Click a point to inspect that term</span></div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ left: -14, right: 8, top: 14 }} onClick={(e) => e?.activePayload && setSel(e.activePayload[0].payload.sem)}>
                <defs><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--s1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--s1)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis domain={[0, 4]} stroke="var(--muted)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTip} cursor={{ stroke: 'var(--line-strong)' }} />
                <Area type="monotone" dataKey="gpa" stroke="var(--s1)" strokeWidth={2.5} fill="url(#gt)" dot={{ r: 3.5, fill: 'var(--s1)', stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={900} />
                {cur && <ReferenceDot x={tn(cur.semester)} y={Number(cur.gpa)} r={8} fill="var(--s2)" stroke="var(--surface)" strokeWidth={2} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card span-5">
            <div className="row between"><h3 style={{ margin: 0 }}>{tn(cur.semester)} · {cur.exam_year}</h3><Chip kind={statusKind(cur.status)}>{cur.division || cur.grade}</Chip></div>
            <div className="row" style={{ gap: 22, margin: '14px 0' }}>
              <div><div className="lbl">GPA</div><div className="display" style={{ fontSize: '1.9rem' }}>{Number(cur.gpa).toFixed(2)}</div></div>
              <div><div className="lbl">Rank</div><div className="display" style={{ fontSize: '1.9rem' }}>{cur.class_rank}<span className="muted small" style={{ fontFamily: 'var(--font-body)' }}> /{cur.class_size}</span></div></div>
              <div><div className="lbl">Percentage</div><div className="display" style={{ fontSize: '1.9rem' }}>{cur.percentage}%</div></div>
            </div>
            <div className="stack">{termSubjects.map((s) => (
              <div key={s.code}><div className="row between small"><span title={s.name}>{s.name.length > 30 ? `${s.name.slice(0, 29)}…` : s.name}</span><span className="mono"><b>{s.You}</b> <span className="muted">vs {s.Class}</span></span></div><Meter value={s.You} color={s.You >= s.Class ? 'var(--s1)' : 'var(--s4)'} /></div>
            ))}</div>
            <div style={{ marginTop: 14 }}><Link to={`/student/results?sem=${cur.semester}`} className="btn paper sm">Open marksheet <ArrowRight size={14} /></Link></div>
          </div>

          <div className="span-12">
            <div className="lbl" style={{ marginBottom: 8 }}>Choose a term</div>
            <div className="grid-4">
              {results.map((r, i) => (
                <motion.button key={r.id} className={`card ticket lift ${cur.id === r.id ? 'on' : ''}`} style={{ textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }} onClick={() => setSel(r.semester)} aria-pressed={cur.id === r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="lbl">{tn(r.semester)} · {r.exam_year}</div>
                  <div className="big">{Number(r.gpa).toFixed(2)}</div>
                  <div className="row between"><Chip kind={statusKind(r.status)}>{r.division || r.grade}</Chip><span className="mono small muted">#{r.class_rank}/{r.class_size}</span></div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="card span-7"><h3>Subject scores vs class average</h3>
            {termSubjects.length === 0 ? <Empty>No data for this term.</Empty> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={termSubjects.map((s) => ({ ...s, code: s.code.replace(/^[A-Z]+/, '') }))} margin={{ left: -14 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="code" stroke="var(--muted)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} stroke="var(--muted)" tickLine={false} axisLine={false} /><Tooltip contentStyle={chartTip} cursor={{ fill: 'var(--surface-2)' }} /><Legend />
                  <Bar dataKey="You" fill="var(--s1)" radius={[5, 5, 0, 0]} /><Bar dataKey="Class" name="Class average" fill="var(--s2)" radius={[5, 5, 0, 0]} /></BarChart>
              </ResponsiveContainer>)}
          </div>
        </>)}

        <div className="card span-5"><h3>Notices</h3>
          {(notes.data?.notices || []).length === 0 ? <Empty title="No notices" /> : notes.data.notices.slice(0, 4).map((n, i) => (
            <div key={n.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}><b className="small">{n.title}</b><p className="muted small" style={{ marginTop: 2 }}>{n.body}</p></div>
          ))}
        </div>
      </div>
    </>
  );
}
