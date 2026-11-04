import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, CalendarCheck, ClipboardList, Percent, PenLine, ArrowRight } from 'lucide-react';
import { Chip, Empty, Meter, PageHeader, Ring, Spinner, Tile, firstName, termName, useLoad } from '../../components/ui.jsx';
import { get } from '../../lib/api';
import { useAuth } from '../../lib/auth.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function TeacherHome() {
  const { user } = useAuth();
  const { data, loading } = useLoad(() => get('/teacher/subjects'), []);
  const notes = useLoad(() => get('/results/notices'), []);
  if (loading) return <Spinner />;
  const subs = data.subjects.map((s) => ({ ...s, pending: Math.max(0, Number(s.expected) - Number(s.entered)), pct: Number(s.expected) ? Math.round((Number(s.entered) / Number(s.expected)) * 100) : 0 }));
  const avg = subs.filter((s) => s.avg_percent != null);
  const pendingMarks = subs.reduce((a, s) => a + s.pending, 0);
  const attDue = subs.filter((s) => s.last_attendance && daysAgo(s.last_attendance) >= 1 && String(s.last_attendance).slice(0, 10) !== today());
  const todo = [
    ...subs.filter((s) => s.pending > 0).map((s) => ({ key: `m${s.id}`, icon: PenLine, title: `Enter marks: ${s.name}`, sub: `${s.pending} of ${s.expected} students still missing`, to: `/teacher/marks?subject=${s.id}`, cta: 'Open marks' })),
    ...attDue.map((s) => ({ key: `a${s.id}`, icon: CalendarCheck, title: `Take attendance: ${s.name}`, sub: `Last taken ${daysAgo(s.last_attendance)} day${daysAgo(s.last_attendance) === 1 ? '' : 's'} ago`, to: `/teacher/attendance?subject=${s.id}`, cta: 'Take now' })),
  ];
  return (
    <>
      <PageHeader crumb={`${user.department || 'Teaching'} department`} title={`${greet()}, ${firstName(user.name)}`} sub="Your subjects, what needs doing and how your classes are performing.">
        <Link to="/teacher/attendance" className="btn paper"><CalendarCheck size={15} /> Take attendance</Link><Link to="/teacher/marks" className="btn"><PenLine size={15} /> Enter marks</Link>
      </PageHeader>
      <div className="grid-4">
        <Tile label="My subjects" value={subs.length} icon={BookOpen} color="var(--s1)" />
        <Tile label="Marks still to enter" value={pendingMarks} icon={ClipboardList} color={pendingMarks ? 'var(--amber)' : 'var(--good)'} delay={0.05} hint={pendingMarks ? 'across current terms' : 'all caught up'} />
        <Tile label="Attendance due" value={attDue.length} icon={CalendarCheck} color={attDue.length ? 'var(--s4)' : 'var(--good)'} delay={0.1} hint="subjects not marked today" />
        <Tile label="Average score" value={avg.length ? avg.reduce((a, s) => a + Number(s.avg_percent), 0) / avg.length : 0} decimals={1} suffix="%" icon={Percent} color="var(--s3)" delay={0.15} hint="across my subjects" />
      </div>

      <div className="bento" style={{ marginTop: 18 }}>
        <div className="card span-5">
          <div className="row between"><h3 style={{ margin: 0 }}>To do</h3><Chip kind={todo.length ? 'warn' : 'pass'}>{todo.length || 'clear'}</Chip></div>
          <div className="stack" style={{ marginTop: 14 }}>
            {todo.length === 0 && <Empty title="Nothing waiting">Marks and attendance are up to date.</Empty>}
            {todo.slice(0, 6).map((t, i) => (
              <motion.div key={t.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={t.to} className="row between" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'nowrap', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}><span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--brand-soft)', color: 'var(--brand)', flexShrink: 0 }}><t.icon size={16} /></span><div><b className="small" style={{ display: 'block' }}>{t.title}</b><span className="muted small">{t.sub}</span></div></div>
                  <ArrowRight size={16} color="var(--muted)" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="card span-7">
          <h3>My subjects</h3>
          {subs.length === 0 ? <Empty title="No subjects assigned yet">Ask the administrator to assign subjects to you.</Empty> : (
            <div className="stack">
              {subs.map((s, i) => (
                <motion.div key={s.id} className="row" style={{ flexWrap: 'nowrap', gap: 16, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Ring value={s.pct} size={58} stroke={6}><span className="mono small" style={{ fontWeight: 700 }}>{Number(s.expected) ? `${s.pct}%` : '-'}</span></Ring>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row between" style={{ flexWrap: 'nowrap' }}><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</b><span className="mono small muted">{s.code}</span></div>
                    <div className="muted small">{s.program} · {termName(s, s.semester)} · {Number(s.expected) ? `${s.entered}/${s.expected} marks entered` : 'no current class'} · {s.class_days} class day{Number(s.class_days) === 1 ? '' : 's'} logged</div>
                    <div className="row" style={{ marginTop: 6, gap: 6 }}>
                      <Link className="btn sm" to={`/teacher/marks?subject=${s.id}`}>Marks</Link>
                      <Link className="btn paper sm" to={`/teacher/attendance?subject=${s.id}`}>Attendance</Link>
                      <Link className="btn ghost sm" to={`/teacher/analytics?subject=${s.id}`}>Insights</Link>
                    </div>
                  </div>
                  {s.avg_percent != null && <div style={{ textAlign: 'right', minWidth: 70 }}><div className="display" style={{ fontSize: '1.25rem' }}>{s.avg_percent}%</div><div className="muted small">class avg</div></div>}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {(notes.data?.notices || []).length > 0 && (
          <div className="card span-12"><h3>Notices</h3>
            <div className="grid-3">{notes.data.notices.slice(0, 3).map((n) => <div key={n.id}><b>{n.title}</b><p className="muted small" style={{ marginTop: 4 }}>{n.body}</p></div>)}</div>
          </div>
        )}
      </div>
      <span className="sr"><Meter value={0} /></span>
    </>
  );
}
