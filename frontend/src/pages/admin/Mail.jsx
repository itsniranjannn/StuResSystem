import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MailCheck, MailWarning, RefreshCw, Send, ShieldQuestion } from 'lucide-react';
import { Chip, Drawer, Empty, Field, PageHeader, Pager, Seg, Spinner, Switch, Tile, useLoad, useTable, useToast, fmtDate } from '../../components/ui.jsx';
import { errMsg, get, post } from '../../lib/api';

const KIND = { sent: 'pass', queued: 'info', failed: 'fail', skipped: 'warn' };

export default function AdminMail() {
  const toast = useToast();
  const { data, loading, reload } = useLoad(() => get('/admin/mail'), []);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [auto, setAuto] = useState(true);
  const [view, setView] = useState(null);
  const queued = data?.stats?.queued || 0;
  useEffect(() => { if (!auto || !queued) return undefined; const i = setInterval(reload, 4000); return () => clearInterval(i); }, [auto, queued, reload]);
  const rows = useMemo(() => (data?.logs || []).filter((l) => filter === 'all' || l.status === filter), [data, filter]);
  const t = useTable(rows, { pageSize: 10 });
  const run = async (key, fn, ok) => { setBusy(key); try { const d = await fn(); toast(typeof ok === 'function' ? ok(d) : ok, d?.ok === false ? 'error' : 'ok'); reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(''); } };
  const open = async (l) => { setView({ ...l, loading: true }); try { const d = await get(`/admin/mail/${l.id}`); setView(d.message); } catch (e) { setView(null); toast(errMsg(e), 'error'); } };
  if (loading) return <Spinner />;
  const s = data.stats;
  return (
    <>
      <PageHeader crumb="Communication" title="Mail center" sub="Result, approval, reset and risk emails go out through your Gmail account. Every message is logged here and can be previewed." />
      <div className="grid-4">
        <Tile label="Sent" value={s.sent || 0} icon={MailCheck} color="var(--good)" />
        <Tile label="Queued" value={s.queued || 0} icon={RefreshCw} color="var(--s1)" delay={0.05} hint={queued ? 'delivering now' : 'nothing waiting'} />
        <Tile label="Failed" value={s.failed || 0} icon={MailWarning} color="var(--bad)" delay={0.1} />
        <Tile label="Skipped" value={s.skipped || 0} icon={ShieldQuestion} color="var(--amber)" delay={0.15} hint="saved while email was off" />
      </div>
      <div className="grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Connection</h3>
          <div className="row" style={{ marginBottom: 12 }}>{data.configured ? <Chip kind="pass"><CheckCircle2 size={13} /> configured</Chip> : <Chip kind="warn">not configured</Chip>}{data.sender && <span className="mono small">{data.sender}</span>}<span className="muted small">via {data.host}</span></div>
          {data.configured ? (
            <div className="row">
              <button className="btn paper" disabled={busy === 'v'} onClick={() => run('v', () => post('/admin/mail/verify'), (d) => (d.ok ? 'Gmail accepted the login' : `Login failed: ${d.error}`))}>Verify login</button>
              <button className="btn paper" disabled={busy === 'r'} onClick={() => run('r', () => post('/admin/mail/retry'), (d) => `${d.requeued} message(s) re-queued`)}><RefreshCw size={15} /> Retry failed and skipped</button>
            </div>
          ) : (
            <ol className="small stack" style={{ paddingLeft: 18 }}>
              <li>Turn on <b>2-Step Verification</b> for the Gmail account.</li>
              <li>In Google Account, Security, create an <b>App password</b>.</li>
              <li>Put the address and the 16-character code in <span className="mono">backend/.env</span> as <span className="mono">EMAIL_USER</span> and <span className="mono">EMAIL_APP_PASSWORD</span>.</li>
              <li>Restart the API, then send a test below.</li>
            </ol>
          )}
        </div>
        <div className="card">
          <h3>Send a test email</h3>
          <Field label="To" hint="Leave empty to send to your own account address"><input className="input" type="email" placeholder="name@example.com" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <button className="btn" disabled={busy === 't'} onClick={() => run('t', () => post('/admin/mail/test', { to: to || undefined }), (d) => (d.configured ? 'Test email queued. It appears in the log below.' : 'Saved as skipped: email is not configured yet.'))}><Send size={15} /> Send test</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 18, padding: 16 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Message log</h3>
          <div className="row"><Seg value={filter} onChange={setFilter} label="Status" options={[{ value: 'all', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'queued', label: 'Queued' }, { value: 'failed', label: 'Failed' }, { value: 'skipped', label: 'Skipped' }]} /><Switch checked={auto} onChange={setAuto} label="Auto-refresh" /><button className="btn paper sm icon" onClick={reload} aria-label="Refresh"><RefreshCw size={14} /></button></div>
        </div>
        {rows.length === 0 ? <Empty title="No messages">Publishing results, approving a teacher or sending a test will appear here.</Empty> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>When</th><th>To</th><th>Subject</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>{t.rows.map((l) => (
                <tr key={l.id} className="click" onClick={() => open(l)}><td className="small">{fmtDate(l.created_at)}</td><td className="mono small">{l.to_email}</td><td className="small">{l.subject}</td><td><Chip>{l.kind}</Chip></td>
                  <td><Chip kind={KIND[l.status]}>{l.status}</Chip>{l.error && <div className="err small" title={l.error}>{l.error.slice(0, 56)}</div>}</td></tr>))}</tbody>
            </table></div>
            <Pager t={t} />
          </>
        )}
      </div>
      <Drawer open={!!view} onClose={() => setView(null)} title="Message preview">
        {view?.loading && <Spinner />}
        {view?.html && (<div className="stack">
          <div className="small"><div><b>To:</b> <span className="mono">{view.to_email}</span></div><div><b>Subject:</b> {view.subject}</div><div className="row" style={{ marginTop: 6 }}><Chip kind={KIND[view.status]}>{view.status}</Chip><span className="muted">{view.attempts} attempt(s)</span></div>{view.error && <div className="err" style={{ marginTop: 6 }}>{view.error}</div>}</div>
          <iframe title="Email preview" sandbox="" srcDoc={view.html} style={{ width: '100%', height: 480, border: '1px solid var(--line-strong)', borderRadius: 10, background: '#fff' }} />
        </div>)}
      </Drawer>
    </>
  );
}
