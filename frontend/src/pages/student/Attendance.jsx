import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { Chip, Empty, Meter, PageHeader, Ring, Spinner, Tile, useLoad, fmtDate } from '../../components/ui.jsx';
import { get } from '../../lib/api';

const COLOR = { present: 'var(--good)', late: 'var(--amber)', absent: 'var(--bad)' };
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

export default function StudentAttendance() {
  const { data, loading } = useLoad(() => get('/results/me/attendance'), []);
  const [subject, setSubject] = useState(null);
  const [hover, setHover] = useState(null);
  const recent = data?.recent || [];
  const shown = useMemo(() => recent.filter((r) => !subject || r.code === subject), [recent, subject]);
  // one cell per day, coloured by the worst status that day for the selected subject
  const cells = useMemo(() => {
    const byDay = new Map();
    shown.forEach((r) => {
      const k = ymd(r.att_date); const prev = byDay.get(k);
      const rank = { present: 0, late: 1, absent: 2 };
      if (!prev || rank[r.status] > rank[prev.status]) byDay.set(k, { date: k, status: r.status, items: [...(prev?.items || []), r] }); else prev.items.push(r);
    });
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-35);
  }, [shown]);
  if (loading) return <Spinner />;
  const eligible = data.overall == null ? null : data.overall >= data.required;
  const below = data.subjects.filter((s) => s.percent < data.required);
  // classes still needed in a subject to climb back to the required percentage, assuming no more absences
  const need = (s) => { const p = data.required / 100; const t = Number(s.total); const good = Number(s.present) + Number(s.late) * 0.5; return Math.max(0, Math.ceil((p * t - good) / (1 - p))); };

  return (
    <>
      <PageHeader crumb="Attendance" title="My attendance" sub={`Most programs require at least ${data.required}% attendance to sit the term-end examination. A late arrival counts as half a day.`} />
      {data.subjects.length === 0 ? <div className="card"><Empty title="No attendance recorded yet">Your teachers will mark attendance in class.</Empty></div> : (
        <div className="bento">
          <div className="card span-4" style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <Ring value={data.overall} size={168} stroke={12} color={eligible ? 'var(--good)' : 'var(--bad)'}><div className="display" style={{ fontSize: '2.2rem' }}>{data.overall}%</div><div className="muted small">overall</div></Ring>
            <div style={{ marginTop: 12 }}><Chip kind={eligible ? 'pass' : 'fail'}>{eligible ? <><CheckCircle2 size={13} /> eligible for exams</> : <><XCircle size={13} /> below the {data.required}% rule</>}</Chip></div>
          </div>
          <div className="span-8 grid-2" style={{ gap: 16 }}>
            <Tile label="Required" value={data.required} suffix="%" icon={CalendarCheck} color="var(--s2)" hint="exam eligibility" />
            <Tile label="Subjects below rule" value={below.length} icon={XCircle} color={below.length ? 'var(--bad)' : 'var(--good)'} delay={0.05} hint={below.length ? 'talk to the subject teacher' : 'all on track'} />
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="row between"><b>Last classes</b>
                <div className="row" style={{ gap: 6 }}>{Object.entries(COLOR).map(([k, c]) => <span key={k} className="row small muted" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />{k}</span>)}</div></div>
              <div className="row" style={{ gap: 5, margin: '12px 0 6px' }}>
                {cells.map((c) => <button key={c.date} aria-label={`${c.date}: ${c.status}`} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c)} onBlur={() => setHover(null)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: COLOR[c.status], opacity: hover && hover.date !== c.date ? 0.45 : 1, transition: 'opacity .15s' }} />)}
              </div>
              <div className="small muted" style={{ minHeight: 22 }}>{hover ? `${fmtDate(hover.date)}: ${hover.items.map((i) => `${i.code} ${i.status}`).join(', ')}` : subject ? `Showing ${subject} only. Hover a square for details.` : 'Hover a square for details. Choose a subject below to filter.'}</div>
            </div>
          </div>

          <div className="card span-7"><div className="row between"><h3 style={{ margin: 0 }}>By subject</h3>{subject && <button className="btn ghost sm" onClick={() => setSubject(null)}>Clear filter</button>}</div>
            <div className="stack" style={{ marginTop: 12 }}>
              {data.subjects.map((s, i) => {
                const low = s.percent < data.required;
                return (
                  <motion.button key={s.subject_id} onClick={() => setSubject(subject === s.code ? null : s.code)} aria-pressed={subject === s.code} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ all: 'unset', cursor: 'pointer', display: 'block', padding: '10px 12px', borderRadius: 10, border: `1px solid ${subject === s.code ? 'var(--brand)' : 'var(--line)'}`, background: subject === s.code ? 'var(--brand-soft)' : 'transparent' }}>
                    <div className="row between small"><b>{s.name}</b><span className="mono"><b style={{ color: low ? 'var(--bad)' : 'inherit' }}>{s.percent}%</b> <span className="muted">· {s.present}P {s.late}L {s.absent}A</span></span></div>
                    <Meter value={s.percent} color={low ? 'var(--bad)' : 'var(--good)'} />
                    {low && <div className="small" style={{ color: 'var(--bad)', marginTop: 4 }}>Attend the next {need(s)} class{need(s) === 1 ? '' : 'es'} in a row to get back to {data.required}%.</div>}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="card span-5"><h3>Recent classes</h3>
            <div className="table-wrap" style={{ maxHeight: 340, overflow: 'auto' }}><table>
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead>
              <tbody>{shown.slice(0, 30).map((r, i) => <tr key={i}><td className="small">{fmtDate(r.att_date)}</td><td className="small">{r.name}</td><td><Chip kind={r.status === 'present' ? 'pass' : r.status === 'late' ? 'warn' : 'fail'}>{r.status}</Chip></td></tr>)}</tbody>
            </table></div>
          </div>
        </div>
      )}
    </>
  );
}
