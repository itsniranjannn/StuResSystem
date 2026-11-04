import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, KeyRound, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import RiskCard from '../../components/RiskCard.jsx';
import { Avatar, Chip, Drawer, Empty, Field, Modal, PageHeader, Pager, Ring, Select, Seg, SortTh, Spark, Spinner, downloadCsv, termName, termOptions, useConfirm, useLoad, useTable, useToast } from '../../components/ui.jsx';
import { del, errMsg, get, post, put } from '../../lib/api';

const blank = { name: '', email: '', password: '', program_id: '', roll_no: '', reg_no: '', semester: 1, batch: new Date().getFullYear(), gender: 'male', father_name: '', guardian_email: '', address: '', phone: '', dob: '' };

export default function AdminStudents() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [pid, setPid] = useState('');
  const [term, setTerm] = useState('');
  const [view, setView] = useState('table');
  const [picked, setPicked] = useState(new Set());
  const progs = useLoad(() => get('/admin/programs'), []);
  const { data, loading, reload } = useLoad(() => get('/admin/students', { q, program_id: pid || undefined }), [q, pid]);
  const [form, setForm] = useState(null);
  const [pw, setPw] = useState(null);
  const [tr, setTr] = useState(null);
  const [quick, setQuick] = useState(null);
  const list = progs.data?.programs || [];
  const program = list.find((p) => String(p.id) === String(pid));
  const fprog = form && list.find((p) => String(p.id) === String(form.program_id));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const rows = useMemo(() => (data?.students || []).filter((s) => !term || String(s.semester) === String(term)).map((s) => ({ ...s, name: s.student_name })), [data, term]);
  const t = useTable(rows, { pageSize: 10, sort: { key: 'name', dir: 'asc' } });
  const counts = useMemo(() => list.map((p) => ({ ...p, n: (data?.students || []).filter((s) => s.program_id === p.id).length })), [list, data]);
  const allOnPage = t.rows.length > 0 && t.rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked((s) => { const n = new Set(s); t.rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; });
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = (only) => {
    const src = only ? rows.filter((r) => picked.has(r.id)) : rows;
    downloadCsv('students.csv', [['Symbol no', 'Name', 'Program', 'Term', 'Batch', 'Email', 'Guardian email', 'Phone'], ...src.map((s) => [s.roll_no, s.student_name, s.program, termName(s, s.semester), s.batch, s.email, s.guardian_email, s.phone])]);
  };
  const peek = async (s) => { setQuick({ s, loading: true }); try { const [ins, tx] = await Promise.all([get(`/results/student-insights/${s.id}`), get(`/results/transcript/${s.id}`)]); setQuick({ s, ins, t: tx }); } catch (er) { setQuick(null); toast(errMsg(er), 'error'); } };
  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) await put(`/admin/students/${form.id}`, { ...form, name: form.student_name });
      else await post('/admin/students', { ...form, program_id: form.program_id || list[0]?.id });
      toast('Student saved'); setForm(null); reload();
    } catch (er) { toast(errMsg(er), 'error'); }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: `Delete ${s.student_name}?`, message: 'This removes the account, marks, attendance and results permanently.', danger: true, confirm: 'Delete student' }))) return;
    try { await del(`/admin/users/${s.user_id}`); toast('Student deleted'); setPicked((p) => { const n = new Set(p); n.delete(s.id); return n; }); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const bulkDelete = async () => {
    if (!(await confirm({ title: `Delete ${picked.size} students?`, message: 'Accounts, marks, attendance and results of every selected student are removed permanently.', danger: true, confirm: `Delete ${picked.size}` }))) return;
    try { for (const s of rows.filter((r) => picked.has(r.id))) await del(`/admin/users/${s.user_id}`); toast(`${picked.size} students deleted`); setPicked(new Set()); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const resetPw = async (e) => { e.preventDefault(); try { await post(`/admin/users/${pw.user_id}/reset-password`, { password: pw.password }); toast('Password reset'); setPw(null); } catch (er) { toast(errMsg(er), 'error'); } };
  const openTranscript = async (s) => { try { setTr(await get(`/results/transcript/${s.id}`)); } catch (er) { toast(errMsg(er), 'error'); } };
  const actions = (s) => (
    <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
      <button className="btn ghost sm icon" onClick={() => openTranscript(s)} aria-label={`Transcript of ${s.student_name}`} title="Transcript"><FileText size={15} /></button>
      <button className="btn ghost sm icon" onClick={() => setForm({ ...s, dob: s.dob ? String(s.dob).slice(0, 10) : '' })} aria-label={`Edit ${s.student_name}`} title="Edit"><Pencil size={15} /></button>
      <button className="btn ghost sm icon" onClick={() => setPw({ user_id: s.user_id, name: s.student_name, password: '' })} aria-label={`Reset password of ${s.student_name}`} title="Reset password"><KeyRound size={15} /></button>
      <button className="btn ghost sm icon" style={{ color: 'var(--bad)' }} onClick={() => remove(s)} aria-label={`Delete ${s.student_name}`} title="Delete"><Trash2 size={15} /></button>
    </div>
  );

  return (
    <>
      <PageHeader crumb="Academics" title="Students" sub="Register, review and manage student records. Click any row for a quick profile.">
        <button className="btn paper" onClick={() => exportCsv(false)}><Download size={15} /> Export</button>
        <button className="btn" onClick={() => setForm({ ...blank, program_id: list[0]?.id || '' })}><Plus size={15} /> Add student</button>
      </PageHeader>

      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        <button className={`chip ${!pid ? 'brand' : ''}`} style={{ cursor: 'pointer', border: 'none', padding: '6px 13px' }} onClick={() => { setPid(''); setTerm(''); }} aria-pressed={!pid}>All programs · {(data?.students || []).length}</button>
        {counts.map((p) => <button key={p.id} className={`chip ${String(pid) === String(p.id) ? 'brand' : ''}`} style={{ cursor: 'pointer', border: 'none', padding: '6px 13px' }} onClick={() => { setPid(String(p.id)); setTerm(''); }} aria-pressed={String(pid) === String(p.id)}>{p.code}</button>)}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search by name or symbol number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" /></div>
          {program && <Select value={term} onChange={setTerm} label="Term filter" placeholder={`All ${program.term_label.toLowerCase()}s`} options={[{ value: '', label: `All ${program.term_label.toLowerCase()}s` }, ...termOptions(program)]} style={{ minWidth: 170 }} />}
          <Seg value={view} onChange={setView} label="View" options={[{ value: 'table', label: 'Table' }, { value: 'cards', label: 'Cards' }]} />
        </div>
        {picked.size > 0 && (
          <motion.div className="row between card flat tint" style={{ padding: '8px 12px', marginBottom: 12 }} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <b className="small">{picked.size} selected</b>
            <div className="row"><button className="btn paper sm" onClick={() => exportCsv(true)}><Download size={14} /> Export selected</button><button className="btn coral sm" onClick={bulkDelete}><Trash2 size={14} /> Delete</button><button className="btn ghost sm" onClick={() => setPicked(new Set())}>Clear</button></div>
          </motion.div>
        )}
        {loading ? <Spinner /> : rows.length === 0 ? <Empty title="No students match">Adjust the search or filters, or add a student.</Empty> : view === 'table' ? (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th style={{ width: 36 }}><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" /></th>
                  <SortTh t={t} k="name">Student</SortTh><SortTh t={t} k="roll_no">Symbol no.</SortTh><SortTh t={t} k="program">Program</SortTh><SortTh t={t} k="semester">Term</SortTh><th>Guardian</th><th />
                </tr></thead>
                <tbody>{t.rows.map((s) => (
                  <tr key={s.id} className="click" onClick={() => peek(s)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.student_name}`} /></td>
                    <td><div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><Avatar name={s.student_name} /><div><b style={{ display: 'block' }}>{s.student_name}</b><span className="muted small">{s.email}</span></div></div></td>
                    <td className="mono">{s.roll_no}</td><td><Chip kind="info">{s.program}</Chip></td><td>{termName(s, s.semester)}</td>
                    <td>{s.guardian_email ? <Chip kind="pass">on file</Chip> : <span className="muted small">none</span>}</td>
                    <td>{actions(s)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
            <Pager t={t} />
          </>
        ) : (
          <>
            <div className="grid-3">
              {t.rows.map((s) => (
                <div key={s.id} className="card lift" style={{ cursor: 'pointer', padding: 16 }} onClick={() => peek(s)}>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}><Avatar name={s.student_name} size={42} /><div style={{ minWidth: 0 }}><b style={{ display: 'block' }}>{s.student_name}</b><span className="mono muted small">{s.roll_no}</span></div></div>
                  <div className="row" style={{ margin: '12px 0 4px', gap: 6 }}><Chip kind="info">{s.program}</Chip><Chip>{termName(s, s.semester)}</Chip>{s.guardian_email && <Chip kind="pass">guardian</Chip>}</div>
                  {actions(s)}
                </div>
              ))}
            </div>
            <Pager t={t} />
          </>
        )}
      </div>

      <Drawer open={!!quick} onClose={() => setQuick(null)} title={quick?.s.student_name || ''}>
        {quick?.loading && <Spinner />}
        {quick?.ins && (<div className="stack">
          <div className="row"><Chip kind="info">{quick.s.program}</Chip><Chip>{termName(quick.s, quick.s.semester)}</Chip><span className="mono muted small">{quick.s.roll_no}</span></div>
          <div className="row" style={{ gap: 22, alignItems: 'center', flexWrap: 'nowrap' }}>
            <Ring value={quick.t.cgpa} max={4} size={112} stroke={9}><div className="display" style={{ fontSize: '1.4rem' }}>{quick.t.cgpa.toFixed(2)}</div><div className="muted small">CGPA</div></Ring>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="lbl">GPA by term</div><Spark data={quick.t.terms.map((x) => Number(x.gpa))} h={50} />
              <div className="row small" style={{ marginTop: 6 }}><Chip>{quick.t.terms.length} terms</Chip><Chip kind={quick.t.backlogs.length ? 'fail' : 'pass'}>{quick.t.backlogs.length} backlogs</Chip></div>
            </div>
          </div>
          <div className="card flat tint"><div className="lbl" style={{ marginBottom: 8 }}>Early-warning check</div><RiskCard risk={quick.ins.risk} /></div>
          <div className="small"><b>Attendance:</b> {quick.ins.attendance.overall != null ? `${quick.ins.attendance.overall}%` : 'not recorded'} · <b>Forecast next GPA:</b> {quick.ins.prediction ? quick.ins.prediction.gpa : '-'}</div>
          <div className="row"><button className="btn sm" onClick={() => { const s = quick.s; setQuick(null); openTranscript(s); }}>Full transcript</button><button className="btn paper sm" onClick={() => { const s = quick.s; setQuick(null); setForm({ ...s, dob: s.dob ? String(s.dob).slice(0, 10) : '' }); }}>Edit student</button></div>
        </div>)}
      </Drawer>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit student' : 'Add student'}>
        {form && (
          <form onSubmit={save}>
            <div className="form-grid">
              <Field label="Full name"><input className="input" required value={form.id ? form.student_name : form.name} onChange={set(form.id ? 'student_name' : 'name')} /></Field>
              <Field label="Symbol or roll number"><input className="input" required value={form.roll_no} onChange={set('roll_no')} /></Field>
              <Field label="Email" hint="Results are emailed here"><input className="input" type="email" required value={form.email || ''} onChange={set('email')} /></Field>
              <Field label="Guardian email (optional)"><input className="input" type="email" value={form.guardian_email || ''} onChange={set('guardian_email')} /></Field>
              {!form.id && <Field label="Program"><Select value={form.program_id} onChange={(v) => setForm({ ...form, program_id: v, semester: 1 })} options={list.map((p) => ({ value: p.id, label: p.name, sub: p.code }))} label="Program" /></Field>}
              {!form.id && <Field label="Initial password" hint="Default Student@123"><input className="input" value={form.password} onChange={set('password')} /></Field>}
              <Field label={fprog ? `Current ${fprog.term_label.toLowerCase()}` : 'Current term'}>{form.id ? <input className="input" type="number" min="1" max="12" value={form.semester} onChange={set('semester')} /> : <Select value={form.semester} onChange={(v) => setForm({ ...form, semester: v })} options={fprog ? termOptions(fprog) : []} label="Term" />}</Field>
              <Field label="Batch (admission year)"><input className="input" type="number" value={form.batch || ''} onChange={set('batch')} /></Field>
              <Field label="Registration number"><input className="input" value={form.reg_no || ''} onChange={set('reg_no')} /></Field>
              <Field label="Gender"><Select value={form.gender || 'male'} onChange={(v) => setForm({ ...form, gender: v })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} label="Gender" /></Field>
              <Field label="Father's name"><input className="input" value={form.father_name || ''} onChange={set('father_name')} /></Field>
              <Field label="Phone"><input className="input" value={form.phone || ''} onChange={set('phone')} /></Field>
              <Field label="Address"><input className="input" value={form.address || ''} onChange={set('address')} /></Field>
              <Field label="Date of birth"><input className="input" type="date" value={form.dob || ''} onChange={set('dob')} /></Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn paper" onClick={() => setForm(null)}>Cancel</button><button className="btn">Save student</button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!pw} onClose={() => setPw(null)} title={`Reset password: ${pw?.name}`}>
        {pw && <form onSubmit={resetPw}><Field label="New password" hint="8+ characters with a letter and a number"><input className="input" required minLength={8} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field><button className="btn">Set password</button></form>}
      </Modal>
      <Modal open={!!tr} onClose={() => setTr(null)} title={`Transcript: ${tr?.student.student_name}`} wide>
        {tr && (<>
          <div className="kv"><div><span>CGPA</span><b>{tr.cgpa.toFixed(2)}</b></div><div><span>Overall</span><b>{tr.overall_percentage}%</b></div><div><span>Final division</span><b>{tr.final_division || 'Not completed'}</b></div><div><span>Backlogs</span><b>{tr.backlogs.length}</b></div></div>
          <div className="table-wrap"><table><thead><tr><th>Term</th><th>Year</th><th className="num">GPA</th><th className="num">%</th><th>Result</th><th className="num">Rank</th></tr></thead>
            <tbody>{tr.terms.map((x) => <tr key={x.id}><td>{x.term_name}</td><td className="mono">{x.exam_year}</td><td className="num">{Number(x.gpa).toFixed(2)}</td><td className="num">{x.percentage}</td><td><Chip kind={x.status === 'pass' ? 'pass' : 'fail'}>{x.status}</Chip> {!x.published && <Chip kind="warn">draft</Chip>}</td><td className="num">{x.class_rank}</td></tr>)}</tbody></table></div>
        </>)}
      </Modal>
    </>
  );
}
