import { useMemo, useState } from 'react';
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Chip, Empty, Field, Modal, PageHeader, Pager, Select, Seg, SortTh, Spinner, termOptions, useConfirm, useLoad, useTable, useToast } from '../../components/ui.jsx';
import { del, errMsg, get, post, put } from '../../lib/api';

export default function AdminSubjects() {
  const toast = useToast();
  const confirm = useConfirm();
  const progs = useLoad(() => get('/admin/programs'), []);
  const list = progs.data?.programs || [];
  const [pid, setPid] = useState('');
  const [sem, setSem] = useState(1);
  const [q, setQ] = useState('');
  const program = list.find((p) => String(p.id) === String(pid)) || list[0];
  const { data, loading, reload } = useLoad(() => (program ? get('/admin/subjects', { semester: sem, program_id: program.id }) : Promise.resolve({ subjects: [] })), [program?.id, sem]);
  const teachers = useLoad(() => get('/admin/teachers'), []);
  const [form, setForm] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const active = (teachers.data?.teachers || []).filter((x) => x.is_active);
  const rows = useMemo(() => (data?.subjects || []).filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const t = useTable(rows, { pageSize: 12, sort: { key: 'code', dir: 'asc' } });
  const credits = rows.reduce((a, s) => a + Number(s.credit), 0);
  const unassigned = rows.filter((s) => !s.teacher_id).length;

  const body = (f) => ({ ...f, semester: Number(f.semester), credit: Number(f.credit), internal_full: Number(f.internal_full), external_full: Number(f.external_full), teacher_id: f.teacher_id || null });
  const save = async (e) => {
    e.preventDefault();
    try { if (form.id) await put(`/admin/subjects/${form.id}`, body(form)); else await post('/admin/subjects', body(form)); toast('Subject saved'); setForm(null); reload(); teachers.reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const setTeacher = async (s, teacher_id) => { try { await put(`/admin/subjects/${s.id}`, body({ ...s, teacher_id })); toast('Teacher updated'); reload(); teachers.reload(); } catch (er) { toast(errMsg(er), 'error'); } };
  const remove = async (s) => {
    if (!(await confirm({ title: `Delete ${s.code}?`, message: 'All marks and attendance recorded for this subject are removed.', danger: true, confirm: 'Delete subject' }))) return;
    try { await del(`/admin/subjects/${s.id}`); toast('Subject deleted'); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const blank = () => ({ program_id: program.id, code: '', name: '', semester: sem, credit: 3, type: 'theory', internal_full: 40, external_full: 60, teacher_id: '' });

  return (
    <>
      <PageHeader crumb="Academics" title="Subjects" sub="The syllabus of each program by term. Assign a teacher straight from the table; changes save immediately.">
        <button className="btn" disabled={!program} onClick={() => setForm(blank())}><Plus size={15} /> Add subject</button>
      </PageHeader>
      <div className="row" style={{ marginBottom: 14 }}>
        <Select value={program?.id} onChange={(v) => { setPid(v); setSem(1); }} options={list.map((p) => ({ value: p.id, label: p.name, sub: p.code }))} label="Program" style={{ minWidth: 'min(280px, 100%)' }} />
        {program && <Seg value={sem} onChange={setSem} options={termOptions(program).map((o) => ({ value: o.value, label: o.label }))} label="Term" />}
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search by code or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search subjects" /></div>
          <div className="row" style={{ gap: 8 }}><Chip>{rows.length} subjects</Chip><Chip kind="info">{credits} credits</Chip>{unassigned > 0 ? <Chip kind="warn">{unassigned} without a teacher</Chip> : rows.length > 0 && <Chip kind="pass">all assigned</Chip>}</div>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <Empty title="No subjects in this term">Add the first subject to start building the syllabus.</Empty> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><SortTh t={t} k="code">Code</SortTh><SortTh t={t} k="name">Subject</SortTh><th>Type</th><SortTh t={t} k="credit" num>Credit</SortTh><th className="num">Internal / external</th><th style={{ minWidth: 220 }}>Teacher</th><th /></tr></thead>
              <tbody>{t.rows.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.code}</td><td><b>{s.name}</b></td><td><Chip>{s.type}</Chip></td><td className="num">{s.credit}</td><td className="num">{s.internal_full} / {s.external_full}</td>
                  <td><Select value={s.teacher_id || ''} onChange={(v) => setTeacher(s, v || null)} label={`Teacher for ${s.code}`} placeholder="Unassigned" options={[{ value: '', label: 'Unassigned' }, ...active.map((x) => ({ value: x.id, label: x.teacher_name, sub: x.department }))]} style={{ minWidth: 200 }} /></td>
                  <td><div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <button className="btn ghost sm icon" onClick={() => setForm({ ...s, teacher_id: s.teacher_id || '' })} aria-label={`Edit ${s.code}`} title="Edit"><Pencil size={15} /></button>
                    <button className="btn ghost sm icon" onClick={() => setForm({ ...s, id: undefined, code: `${s.code}-COPY`, teacher_id: s.teacher_id || '' })} aria-label={`Duplicate ${s.code}`} title="Duplicate"><Copy size={15} /></button>
                    <button className="btn ghost sm icon" style={{ color: 'var(--bad)' }} onClick={() => remove(s)} aria-label={`Delete ${s.code}`} title="Delete"><Trash2 size={15} /></button>
                  </div></td>
                </tr>))}</tbody>
            </table></div>
            <Pager t={t} />
          </>
        )}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit subject' : 'Add subject'}>
        {form && (
          <form onSubmit={save}>
            <div className="form-grid">
              <Field label="Code"><input className="input" required value={form.code} onChange={set('code')} /></Field>
              <Field label="Name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
              <Field label="Term"><Select value={form.semester} onChange={(v) => setForm({ ...form, semester: v })} options={program ? termOptions(program) : []} label="Term" /></Field>
              <Field label="Credit hours"><input className="input" type="number" step="0.5" min="0.5" max="8" required value={form.credit} onChange={set('credit')} /></Field>
              <Field label="Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['theory', 'practical', 'project'].map((x) => ({ value: x, label: x }))} label="Type" /></Field>
              <Field label="Teacher"><Select value={form.teacher_id} onChange={(v) => setForm({ ...form, teacher_id: v })} placeholder="Unassigned" options={[{ value: '', label: 'Unassigned' }, ...active.map((x) => ({ value: x.id, label: x.teacher_name }))]} label="Teacher" /></Field>
              <Field label="Internal full marks"><input className="input" type="number" min="0" required value={form.internal_full} onChange={set('internal_full')} /></Field>
              <Field label="External full marks" hint="0 for project-only subjects"><input className="input" type="number" min="0" required value={form.external_full} onChange={set('external_full')} /></Field>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn paper" onClick={() => setForm(null)}>Cancel</button><button className="btn">Save subject</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
