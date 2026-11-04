import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, MapPin, NotebookPen, Plus, Save, Trash2 } from 'lucide-react';
import { Chip, Empty, Field, Modal, PageHeader, Select, Seg, Spinner, fmtDate, termName, useConfirm, useLoad, useToast } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { del, errMsg, get, post, put } from '../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const STATUS = [{ value: 'submitted', label: 'In' }, { value: 'late', label: 'Late' }, { value: 'missing', label: 'Missing' }];

// One page for every role: today's classes, the weekly timetable, the class diary and assignments.
// Teachers and admins edit; students see their own current class and their own assignment status.
export default function Classes() {
  const { user } = useAuth();
  const manage = user.role !== 'student';
  const [tab, setTab] = useState('today');
  const tabs = [{ value: 'today', label: 'Today' }, { value: 'timetable', label: 'Timetable' }, { value: 'diary', label: 'Class diary' }, { value: 'assignments', label: 'Assignments' }];
  return (
    <>
      <PageHeader crumb="Daily classes" title="Classes" sub={manage ? 'Plan the week, record what was taught and track assignments, all in one place.' : 'What is on today, what was taught, and what is due.'}>
        <Seg value={tab} onChange={setTab} label="Section" options={tabs} />
      </PageHeader>
      {tab === 'today' && <Today manage={manage} />}
      {tab === 'timetable' && <Timetable manage={manage} role={user.role} />}
      {tab === 'diary' && <Diary manage={manage} role={user.role} />}
      {tab === 'assignments' && <Assignments manage={manage} role={user.role} />}
    </>
  );
}

// Subjects the user may manage (teacher: assigned, admin: all).
function useSubjects(role, enabled) {
  return useLoad(() => (enabled ? get(role === 'admin' ? '/admin/subjects' : '/teacher/subjects') : Promise.resolve({ subjects: [] })), [role, enabled]);
}
const subjectOptions = (list) => list.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, sub: `${s.program} ${termName(s, s.semester)}` }));

function Today({ manage }) {
  const d = useLoad(() => get('/classroom/today'), []);
  if (d.loading) return <Spinner />;
  const { classes, date, weekday } = d.data;
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12 }}><h3 style={{ margin: 0 }}>{DAYS[weekday]}, {fmtDate(date)}</h3><Chip kind="info">{classes.length} class{classes.length === 1 ? '' : 'es'}</Chip></div>
      {classes.length === 0 ? <Empty title="No classes today">{weekday === 6 ? 'Saturday is the weekly holiday.' : 'Nothing is scheduled for today.'}</Empty> : (
        <div className="stack" style={{ gap: 8 }}>
          {classes.map((c) => (
            <div key={c.id} className="tile" style={{ padding: 14 }}>
              <div className="row between">
                <div><b>{c.code} · {c.subject_name}</b><div className="muted small">{c.teacher_name || 'Teacher not assigned'}</div></div>
                <div className="row" style={{ gap: 8 }}><Chip><Clock size={12} /> {c.start_time} to {c.end_time}</Chip>{c.room && <Chip><MapPin size={12} /> {c.room}</Chip>}</div>
              </div>
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                {c.topic ? <Chip kind="pass"><CheckCircle2 size={12} /> Taught: {c.topic}</Chip> : <Chip kind="warn">Topic not logged yet</Chip>}
                {manage && (c.attendance_marked > 0 ? <Chip kind="pass">Attendance taken</Chip> : <Chip kind="warn">Attendance pending</Chip>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Timetable({ manage, role }) {
  const toast = useToast(); const confirm = useConfirm();
  const tt = useLoad(() => get('/classroom/timetable'), []);
  const subs = useSubjects(role, manage);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subject_id: '', weekday: 0, start_time: '09:00', end_time: '10:00', room: '' });
  const [busy, setBusy] = useState(false);
  const byDay = useMemo(() => DAYS.map((_, i) => (tt.data?.slots || []).filter((s) => s.weekday === i)), [tt.data]);
  if (tt.loading) return <Spinner />;
  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await post('/classroom/timetable', f); toast('Class added to the timetable'); setOpen(false); tt.reload(); } catch (er) { toast(errMsg(er), 'error'); } finally { setBusy(false); }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: 'Remove this class?', message: `${s.code} on ${DAYS[s.weekday]} at ${s.start_time} will be removed from the timetable.`, danger: true, confirm: 'Remove' }))) return;
    try { await del(`/classroom/timetable/${s.id}`); toast('Class removed'); tt.reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  return (
    <>
      {manage && <div className="row" style={{ marginBottom: 12, justifyContent: 'flex-end' }}><button className="btn" onClick={() => { setF({ ...f, subject_id: subs.data?.subjects?.[0]?.id || '' }); setOpen(true); }}><Plus size={15} /> Add class</button></div>}
      {tt.data.slots.length === 0 ? <div className="card"><Empty title="No timetable yet">{manage ? 'Add the first class to start the week plan.' : 'Your timetable has not been set up yet.'}</Empty></div> : (
        <div className="bento">
          {byDay.map((slots, i) => (i === 6 && slots.length === 0 ? null : (
            <div key={i} className="card span-4">
              <h3>{DAYS[i]}</h3>
              {slots.length === 0 ? <p className="muted small">No classes</p> : slots.map((s) => (
                <div key={s.id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                  <div style={{ minWidth: 0 }}><b>{s.code}</b> <span className="muted small">{s.subject_name}</span>
                    <div className="mono small muted"><CalendarClock size={12} style={{ verticalAlign: -2 }} /> {s.start_time} to {s.end_time}{s.room ? ` · ${s.room}` : ''}{manage ? ` · ${s.program} ${termName(s, s.semester)}` : ''}</div></div>
                  {manage && <button className="btn paper sm" aria-label={`Remove ${s.code} on ${DAYS[i]}`} onClick={() => remove(s)}><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
          )))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add a class">
        <form onSubmit={add} className="stack">
          <Field label="Subject"><Select value={f.subject_id} onChange={(v) => setF({ ...f, subject_id: v })} label="Subject" options={subjectOptions(subs.data?.subjects || [])} /></Field>
          <Field label="Day"><Select value={f.weekday} onChange={(v) => setF({ ...f, weekday: Number(v) })} label="Day" options={DAYS.map((d, i) => ({ value: i, label: d }))} /></Field>
          <div className="form-grid">
            <Field label="Starts"><input className="input" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></Field>
            <Field label="Ends"><input className="input" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></Field>
          </div>
          <Field label="Room (optional)"><input className="input" maxLength={40} value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} /></Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn paper" onClick={() => setOpen(false)}>Cancel</button><button className="btn" disabled={busy || !f.subject_id}>{busy ? 'Adding...' : 'Add class'}</button></div>
        </form>
      </Modal>
    </>
  );
}

function Diary({ manage, role }) {
  const toast = useToast();
  const subs = useSubjects(role, manage);
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(localDate());
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const sid = subject || subs.data?.subjects?.[0]?.id || '';
  const logs = useLoad(() => get('/classroom/diary', manage ? (sid ? { subject_id: sid } : undefined) : undefined), [sid, manage, subs.loading]);
  useEffect(() => {
    const hit = logs.data?.logs?.find((l) => l.log_date === date && String(l.subject_id) === String(sid));
    setTopic(hit?.topic || ''); setNotes(hit?.notes || '');
  }, [logs.data, date, sid]);
  if (manage && subs.loading) return <Spinner />;
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await put('/classroom/logs', { subject_id: sid, date, topic, notes }); toast('Class diary saved'); logs.reload(); } catch (er) { toast(errMsg(er), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="bento">
      {manage && (
        <form className="card span-5" onSubmit={save}>
          <h3><NotebookPen size={16} style={{ verticalAlign: -3 }} /> Log a class</h3>
          <Field label="Subject"><Select value={sid} onChange={setSubject} label="Subject" options={subjectOptions(subs.data.subjects)} /></Field>
          <Field label="Date"><input className="input" type="date" max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="What was taught"><input className="input" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} required /></Field>
          <Field label="Notes (optional)" hint="Reading, homework or anything students should know"><textarea className="input" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button className="btn" disabled={busy || !sid || !topic.trim()}><Save size={15} /> {busy ? 'Saving...' : 'Save to diary'}</button>
        </form>
      )}
      <div className={`card ${manage ? 'span-7' : 'span-12'}`}>
        <h3>Recent classes</h3>
        {logs.loading ? <Spinner /> : logs.data.logs.length === 0 ? <Empty title="Nothing logged yet" /> : logs.data.logs.map((l) => (
          <div key={l.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
            <div className="row between"><b>{l.topic}</b><span className="mono small muted">{fmtDate(l.log_date)}</span></div>
            <div className="muted small">{l.code} · {l.subject_name}</div>
            {l.notes && <p className="small" style={{ margin: '6px 0 0' }}>{l.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Assignments({ manage, role }) {
  const toast = useToast(); const confirm = useConfirm();
  const list = useLoad(() => get('/classroom/assignments'), []);
  const subs = useSubjects(role, manage);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subject_id: '', title: '', description: '', due_date: localDate(), max_marks: '' });
  const [busy, setBusy] = useState(false);
  const [track, setTrack] = useState(null);
  if (list.loading) return <Spinner />;
  const create = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await post('/classroom/assignments', f); toast('Assignment created'); setOpen(false); list.reload(); } catch (er) { toast(errMsg(er), 'error'); } finally { setBusy(false); }
  };
  const remove = async (a) => {
    if (!(await confirm({ title: 'Delete this assignment?', message: `"${a.title}" and its submission records will be deleted.`, danger: true, confirm: 'Delete' }))) return;
    try { await del(`/classroom/assignments/${a.id}`); toast('Assignment deleted'); list.reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const today = localDate();
  const rows = list.data.assignments;
  return (
    <>
      {manage && <div className="row" style={{ marginBottom: 12, justifyContent: 'flex-end' }}><button className="btn" onClick={() => { setF({ ...f, subject_id: subs.data?.subjects?.[0]?.id || '' }); setOpen(true); }}><Plus size={15} /> New assignment</button></div>}
      {rows.length === 0 ? <div className="card"><Empty title="No assignments" /></div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Assignment</th><th>Subject</th><th>Due</th>{manage ? <><th className="num">Handed in</th><th /></> : <th>Your status</th>}</tr></thead>
          <tbody>{rows.map((a) => {
            const overdue = a.due_date < today;
            return (
              <tr key={a.id}>
                <td><b>{a.title}</b>{a.description && <div className="muted small">{a.description}</div>}</td>
                <td className="mono">{a.code}</td>
                <td><Chip kind={overdue ? '' : 'info'}>{fmtDate(a.due_date)}</Chip></td>
                {manage ? (
                  <>
                    <td className="num mono">{a.handed_in} / {a.class_size}</td>
                    <td><div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}><button className="btn paper sm" onClick={() => setTrack(a)}>Track</button><button className="btn paper sm" aria-label={`Delete ${a.title}`} onClick={() => remove(a)}><Trash2 size={14} /></button></div></td>
                  </>
                ) : (
                  <td>{a.status ? <Chip kind={a.status === 'missing' ? 'fail' : a.status === 'late' ? 'warn' : 'pass'}>{a.status}{a.marks != null ? ` · ${a.marks}${a.max_marks ? `/${a.max_marks}` : ''}` : ''}</Chip> : <Chip kind={overdue ? 'warn' : ''}>{overdue ? 'Not marked' : 'Pending'}</Chip>}{a.feedback && <div className="muted small">{a.feedback}</div>}</td>
                )}
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New assignment">
        <form onSubmit={create} className="stack">
          <Field label="Subject"><Select value={f.subject_id} onChange={(v) => setF({ ...f, subject_id: v })} label="Subject" options={subjectOptions(subs.data?.subjects || [])} /></Field>
          <Field label="Title"><input className="input" maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Details (optional)"><textarea className="input" rows={3} maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="Due date"><input className="input" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} required /></Field>
            <Field label="Maximum marks (optional)"><input className="input" type="number" min="1" max="100" step="0.5" value={f.max_marks} onChange={(e) => setF({ ...f, max_marks: e.target.value })} /></Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn paper" onClick={() => setOpen(false)}>Cancel</button><button className="btn" disabled={busy || !f.subject_id || !f.title.trim()}>{busy ? 'Creating...' : 'Create'}</button></div>
        </form>
      </Modal>
      {track && <Tracker a={track} onClose={() => { setTrack(null); list.reload(); }} />}
    </>
  );
}

function Tracker({ a, onClose }) {
  const toast = useToast();
  const sheet = useLoad(() => get(`/classroom/assignments/${a.id}/status`), [a.id]);
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setRows({}); }, [sheet.data]);
  const set = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  const entries = Object.entries(rows).map(([student_id, v]) => ({ student_id: Number(student_id), ...v })).filter((e) => e.status);
  const save = async () => {
    setBusy(true);
    try { const d = await put(`/classroom/assignments/${a.id}/status`, { entries }); toast(`Saved ${d.saved} record${d.saved === 1 ? '' : 's'}`); sheet.reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Track: ${a.title}`} wide>
      {sheet.loading ? <Spinner /> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Student</th><th>Status</th><th className="num">Marks{a.max_marks ? ` / ${a.max_marks}` : ''}</th></tr></thead>
            <tbody>{sheet.data.roster.map((s) => {
              const r = rows[s.student_id] || {};
              const status = r.status ?? s.status ?? '';
              return (
                <tr key={s.student_id}>
                  <td><b>{s.student_name}</b><div className="mono small muted">{s.roll_no}</div></td>
                  <td><Seg value={status} onChange={(v) => set(s.student_id, 'status', v)} label={`Status of ${s.student_name}`} options={STATUS} /></td>
                  <td className="num"><input className="input marks-input" type="number" min="0" max={a.max_marks || 100} step="0.5" value={r.marks ?? s.marks ?? ''} onChange={(e) => setRows((x) => ({ ...x, [s.student_id]: { ...x[s.student_id], status: x[s.student_id]?.status ?? s.status ?? 'submitted', marks: e.target.value } }))} aria-label={`Marks for ${s.student_name}`} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><button className="btn paper" onClick={onClose}>Close</button><button className="btn" onClick={save} disabled={busy || !entries.length}><Save size={15} /> {busy ? 'Saving...' : `Save ${entries.length || ''}`}</button></div>
        </>
      )}
    </Modal>
  );
}
