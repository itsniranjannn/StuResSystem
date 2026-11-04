import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Search, Trash2, X } from 'lucide-react';
import { Avatar, Chip, Drawer, Empty, Meter, PageHeader, Pager, Select, SortTh, Spinner, termName, useConfirm, useLoad, useTable, useToast } from '../../components/ui.jsx';
import { del, errMsg, get, patch, put } from '../../lib/api';

export default function AdminTeachers() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [add, setAdd] = useState('');
  const { data, loading, reload } = useLoad(() => get('/admin/teachers'), []);
  const subs = useLoad(() => get('/admin/subjects'), []);
  const all = data?.teachers || [];
  const pending = all.filter((t) => !t.is_active);
  const rows = useMemo(() => all.filter((t) => t.is_active && `${t.teacher_name} ${t.department} ${t.email}`.toLowerCase().includes(q.toLowerCase())).map((t) => ({ ...t, name: t.teacher_name })), [all, q]);
  const t = useTable(rows, { pageSize: 8, sort: { key: 'name', dir: 'asc' } });
  const max = Math.max(6, ...rows.map((r) => Number(r.subject_count)));
  const mine = (id) => (subs.data?.subjects || []).filter((s) => s.teacher_id === id);
  const free = (subs.data?.subjects || []).filter((s) => !s.teacher_id);
  const current = open && all.find((x) => x.id === open);

  const toggle = async (x, active) => { try { await patch(`/admin/users/${x.user_id}/active`, { is_active: active }); toast(active ? `${x.teacher_name} approved and notified` : `${x.teacher_name} disabled`); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const remove = async (x) => {
    if (!(await confirm({ title: `Delete ${x.teacher_name}?`, message: 'Their subjects become unassigned. Entered marks are kept.', danger: true, confirm: 'Delete teacher' }))) return;
    try { await del(`/admin/users/${x.user_id}`); toast('Teacher deleted'); setOpen(null); reload(); subs.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const assign = async (subject, teacherId) => {
    try { await put(`/admin/subjects/${subject.id}`, { ...subject, teacher_id: teacherId }); toast(teacherId ? 'Subject assigned' : 'Subject unassigned'); setAdd(''); reload(); subs.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <PageHeader crumb="Academics" title="Teachers" sub="Approve registrations, see each teacher's workload and assign subjects. Teachers can enter marks only for subjects assigned to them." />
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div className="card" style={{ marginBottom: 16, borderColor: 'var(--warn)' }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="row between" style={{ marginBottom: 10 }}><b>{pending.length} registration{pending.length > 1 ? 's' : ''} waiting for approval</b><Chip kind="warn">action needed</Chip></div>
            <div className="stack">
              {pending.map((x) => (
                <div key={x.id} className="row between" style={{ flexWrap: 'nowrap' }}>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}><Avatar name={x.teacher_name} /><div><b style={{ display: 'block' }}>{x.teacher_name}</b><span className="muted small">{x.email} · {x.department}{x.qualification ? ` · ${x.qualification}` : ''}</span></div></div>
                  <div className="row"><button className="btn good sm" onClick={() => toggle(x, true)}><Check size={14} /> Approve</button><button className="btn coral sm" onClick={() => remove(x)}><X size={14} /> Reject</button></div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card" style={{ padding: 16 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search teachers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search teachers" /></div>
          <span className="muted small">{rows.length} active teacher{rows.length === 1 ? '' : 's'} · {free.length} unassigned subject{free.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <Empty title="No teachers found">Teachers can register from the sign-up page and appear here for approval.</Empty> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><SortTh t={t} k="name">Teacher</SortTh><SortTh t={t} k="department">Department</SortTh><th>Qualification</th><SortTh t={t} k="subject_count">Workload</SortTh><th /></tr></thead>
              <tbody>{t.rows.map((x) => (
                <tr key={x.id} className="click" onClick={() => setOpen(x.id)}>
                  <td><div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><Avatar name={x.teacher_name} /><div><b style={{ display: 'block' }}>{x.teacher_name}</b><span className="muted small">{x.email}</span></div></div></td>
                  <td>{x.department}</td><td className="muted">{x.qualification || '-'}</td>
                  <td style={{ minWidth: 160 }}><div className="row between small"><span>{x.subject_count} subject{x.subject_count === 1 ? '' : 's'}</span></div><Meter value={Number(x.subject_count)} max={max} color={Number(x.subject_count) > 5 ? 'var(--warn)' : 'var(--s1)'} /></td>
                  <td onClick={(e) => e.stopPropagation()}><button className="btn paper sm" onClick={() => setOpen(x.id)}>Manage</button></td>
                </tr>))}</tbody>
            </table></div>
            <Pager t={t} />
          </>
        )}
      </div>

      <Drawer open={!!current} onClose={() => setOpen(null)} title={current?.teacher_name || ''}>
        {current && (
          <div className="stack">
            <div className="row" style={{ gap: 12, flexWrap: 'nowrap' }}><Avatar name={current.teacher_name} size={48} /><div><div className="muted small">{current.email}</div><div className="row" style={{ marginTop: 4, gap: 6 }}><Chip kind="info">{current.department}</Chip>{current.qualification && <Chip>{current.qualification}</Chip>}</div></div></div>
            <div><div className="lbl" style={{ marginBottom: 8 }}>Assigned subjects ({mine(current.id).length})</div>
              {mine(current.id).length === 0 ? <p className="muted small">Nothing assigned yet.</p> : mine(current.id).map((s) => (
                <div key={s.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                  <div><b className="small" style={{ display: 'block' }}>{s.name}</b><span className="muted small mono">{s.code} · {s.program} {termName({ term_label: 'Term', term_offset: 0 }, s.semester)}</span></div>
                  <button className="btn ghost sm" onClick={() => assign(s, null)}>Unassign</button>
                </div>
              ))}
            </div>
            <div><div className="lbl" style={{ marginBottom: 8 }}>Assign another subject</div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Select value={add} onChange={setAdd} placeholder={free.length ? 'Choose an unassigned subject' : 'No unassigned subjects'} label="Subject to assign" options={free.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, sub: s.program }))} style={{ flex: 1 }} />
                <button className="btn" disabled={!add} onClick={() => assign(free.find((s) => String(s.id) === String(add)), current.id)}><Plus size={15} /> Assign</button>
              </div>
            </div>
            <hr className="divider" />
            <div className="row"><button className="btn paper sm" onClick={() => toggle(current, false)}>Disable account</button><button className="btn coral sm" onClick={() => remove(current)}><Trash2 size={14} /> Delete teacher</button></div>
          </div>
        )}
      </Drawer>
    </>
  );
}
