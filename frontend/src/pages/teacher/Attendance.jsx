import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { Avatar, Chip, Empty, Meter, PageHeader, Select, Seg, Spinner, termName, useLoad, useToast } from '../../components/ui.jsx';
import { get, put, errMsg } from '../../lib/api';

const today = () => new Date().toISOString().slice(0, 10);
const STATUS = [{ value: 'present', label: 'Present' }, { value: 'late', label: 'Late' }, { value: 'absent', label: 'Absent' }];

export default function TeacherAttendance() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const subs = useLoad(() => get('/teacher/subjects'), []);
  const subjectId = params.get('subject') || subs.data?.subjects?.[0]?.id;
  const date = params.get('date') || today();
  const sheet = useLoad(() => (subjectId ? get(`/teacher/subjects/${subjectId}/attendance`, { date }) : Promise.resolve(null)), [subjectId, date]);
  const [rows, setRows] = useState([]);
  const [orig, setOrig] = useState('');
  const [busy, setBusy] = useState(false);
  const [onlyAbsent, setOnlyAbsent] = useState(false);
  useEffect(() => {
    if (!sheet.data) return;
    const r = sheet.data.roster.map((x) => ({ ...x, status: x.status || 'present', saved: !!x.status }));
    setRows(r); setOrig(JSON.stringify(r.map((x) => x.status)));
  }, [sheet.data]);
  const dirty = rows.length > 0 && (JSON.stringify(rows.map((x) => x.status)) !== orig || rows.some((r) => !r.saved));
  const counts = useMemo(() => rows.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {}), [rows]);
  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => !onlyAbsent || r.status !== 'present');
  const set = (i, status) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status } : r)));
  const all = (status) => setRows((rs) => rs.map((r) => ({ ...r, status })));
  const sub = sheet.data?.subject;
  const rule = sub?.attendance_required ?? 80;

  const save = async () => {
    setBusy(true);
    try { const d = await put(`/teacher/subjects/${subjectId}/attendance`, { date, entries: rows.map((r) => ({ student_id: r.student_id, status: r.status })) }); toast(`Attendance saved for ${d.saved} students`); sheet.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  if (subs.loading) return <Spinner />;
  if (!subs.data.subjects.length) return <><PageHeader title="Attendance" /><div className="card"><Empty title="No subjects assigned to you" /></div></>;
  const days = sheet.data?.days || [];

  return (
    <>
      <PageHeader crumb="Attendance" title="Take attendance" sub={`Everyone starts as present. Change only the exceptions, then save. Students under ${rule}% are flagged because they risk missing exam eligibility.`}>
        <button className="btn" onClick={save} disabled={busy || !rows.length || !dirty}><Save size={15} /> {busy ? 'Saving...' : 'Save attendance'}</button>
      </PageHeader>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="row between">
          <div className="row">
            <Select value={subjectId} onChange={(v) => setParams({ subject: v, date })} style={{ minWidth: 'min(340px, 100%)' }} label="Subject" options={subs.data.subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, sub: `${s.program} ${termName(s, s.semester)}` }))} />
            <input className="input" type="date" style={{ width: 168 }} max={today()} value={date} onChange={(e) => setParams({ subject: subjectId, date: e.target.value })} aria-label="Date" />
          </div>
          <div className="row"><Chip kind="pass">{counts.present || 0} present</Chip><Chip kind="warn">{counts.late || 0} late</Chip><Chip kind="fail">{counts.absent || 0} absent</Chip>{dirty ? <Chip kind="warn">unsaved</Chip> : rows.length > 0 && <Chip kind="info">saved</Chip>}</div>
        </div>
        {days.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lbl" style={{ marginBottom: 6 }}>Classes already recorded ({days.length})</div>
            <div className="row" style={{ gap: 6 }}>{days.slice(0, 14).map((d) => { const s = String(d).slice(0, 10); return <button key={s} className={`chip ${s === date ? 'brand' : ''}`} style={{ cursor: 'pointer', border: 'none', padding: '4px 10px' }} onClick={() => setParams({ subject: subjectId, date: s })} aria-pressed={s === date}>{new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</button>; })}</div>
          </div>
        )}
      </div>

      {sheet.loading ? <Spinner /> : rows.length === 0 ? <div className="card"><Empty title="No students in this class" /></div> : (
        <>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="row"><button className="btn paper sm" onClick={() => all('present')}>Mark all present</button><button className="btn paper sm" onClick={() => all('absent')}>Mark all absent</button></div>
            <label className="switch"><input type="checkbox" checked={onlyAbsent} onChange={(e) => setOnlyAbsent(e.target.checked)} /><span className="tr" /><span className="small">Only absent and late</span></label>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Student</th><th>Symbol no.</th><th style={{ minWidth: 150 }}>Overall</th><th>Status on {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</th></tr></thead>
            <tbody>{shown.length === 0 && <tr><td colSpan={4}><Empty title="Everyone is present" /></td></tr>}
              {shown.map(({ r, i }) => (
                <tr key={r.student_id}>
                  <td><div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><Avatar name={r.student_name} size={30} /><b>{r.student_name}</b></div></td>
                  <td className="mono">{r.roll_no}</td>
                  <td>{r.percent == null ? <span className="muted small">no record</span> : <div><div className="row between small"><b className="mono" style={{ color: r.percent < rule ? 'var(--bad)' : 'inherit' }}>{r.percent}%</b>{r.percent < rule && <Chip kind="fail">below {rule}%</Chip>}</div><Meter value={r.percent} color={r.percent < rule ? 'var(--bad)' : 'var(--good)'} /></div>}</td>
                  <td><Seg value={r.status} onChange={(v) => set(i, v)} label={`Attendance of ${r.student_name}`} options={STATUS} /></td>
                </tr>))}</tbody>
          </table></div>
        </>
      )}
    </>
  );
}
