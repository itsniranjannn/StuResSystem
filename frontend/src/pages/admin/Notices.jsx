import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Chip, Empty, Field, PageHeader, Select, Seg, Spinner, Switch, useConfirm, useLoad, useToast, fmtDate } from '../../components/ui.jsx';
import { del, errMsg, get, post } from '../../lib/api';

const AUD = { all: 'Everyone', teacher: 'Teachers', student: 'Students' };

export default function AdminNotices() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useLoad(() => get('/admin/notices'), []);
  const mail = useLoad(() => get('/admin/mail'), []);
  const [f, setF] = useState({ title: '', body: '', audience: 'all', email: false });
  const [filter, setFilter] = useState('all');
  const list = useMemo(() => (data?.notices || []).filter((n) => filter === 'all' || n.audience === filter), [data, filter]);
  const submit = async (e) => {
    e.preventDefault();
    try { const d = await post('/admin/notices', f); toast(d.queued ? `Notice posted, ${d.queued} emails queued` : 'Notice posted'); setF({ title: '', body: '', audience: 'all', email: false }); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const remove = async (n) => { if (await confirm({ title: 'Delete this notice?', message: n.title, danger: true, confirm: 'Delete' })) { try { await del(`/admin/notices/${n.id}`); reload(); } catch (er) { toast(errMsg(er), 'error'); } } };
  return (
    <>
      <PageHeader crumb="Communication" title="Notices" sub="Announcements for teachers and students. Optionally email everyone in the audience at the same time." />
      <div className="bento">
        <form className="card span-5" onSubmit={submit}>
          <h3>New notice</h3>
          <Field label="Title"><input className="input" required maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Message" hint={`${f.body.length} characters`}><textarea className="input" rows={5} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <Field label="Audience"><Select value={f.audience} onChange={(v) => setF({ ...f, audience: v })} label="Audience" options={Object.entries(AUD).map(([value, label]) => ({ value, label }))} /></Field>
          <Switch checked={f.email} onChange={(email) => setF({ ...f, email })} label="Also send by email" />
          {f.email && !mail.data?.configured && <p className="err small" style={{ marginTop: 8 }}>Email is not set up: messages will be logged as skipped.</p>}
          {(f.title || f.body) && <div className="card flat tint" style={{ marginTop: 14 }}><div className="lbl" style={{ marginBottom: 6 }}>Preview</div><b>{f.title || 'Title'}</b> <Chip kind="info">{AUD[f.audience]}</Chip><p className="muted small" style={{ marginTop: 4 }}>{f.body || 'Message'}</p></div>}
          <div style={{ marginTop: 16 }}><button className="btn">Post notice</button></div>
        </form>
        <div className="card span-7">
          <div className="row between" style={{ marginBottom: 12 }}><h3 style={{ margin: 0 }}>Posted</h3><Seg value={filter} onChange={setFilter} label="Audience filter" options={[{ value: 'all', label: 'All' }, { value: 'teacher', label: 'Teachers' }, { value: 'student', label: 'Students' }]} /></div>
          {loading ? <Spinner /> : list.length === 0 ? <Empty title="No notices" /> : list.map((n) => (
            <div key={n.id} className="row between" style={{ alignItems: 'flex-start', padding: '14px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
              <div><div className="row" style={{ gap: 8 }}><b>{n.title}</b><Chip kind="info">{AUD[n.audience]}</Chip></div><p className="muted small" style={{ margin: '4px 0' }}>{n.body}</p><span className="mono small muted">{fmtDate(n.created_at)}</span></div>
              <button className="btn ghost sm icon" style={{ color: 'var(--bad)' }} onClick={() => remove(n)} aria-label={`Delete ${n.title}`}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
