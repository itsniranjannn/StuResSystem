import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { Chip, Empty, PageHeader, Pager, Spinner, downloadCsv, useLoad, useTable } from '../../components/ui.jsx';
import { get } from '../../lib/api';

const GROUPS = { all: 'All', login: 'Sign-ins', result: 'Results', marks: 'Marks', user: 'Users', mail: 'Mail' };
const match = (a, g) => g === 'all' || (g === 'login' && /LOGIN|REGISTER|PASSWORD/.test(a)) || (g === 'result' && /RESULT|PROMOTE/.test(a)) || (g === 'marks' && /MARKS|ATTENDANCE/.test(a)) || (g === 'user' && /USER|STUDENT|TEACHER|SUBJECT|PROGRAM|SETTINGS/.test(a)) || (g === 'mail' && /NOTICE|RISK|MAIL/.test(a));

export default function AdminAudit() {
  const { data, loading, reload } = useLoad(() => get('/admin/audit'), []);
  const [q, setQ] = useState('');
  const [g, setG] = useState('all');
  const rows = useMemo(() => (data?.logs || []).filter((l) => match(l.action, g) && `${l.user_name} ${l.detail} ${l.action}`.toLowerCase().includes(q.toLowerCase())), [data, q, g]);
  const t = useTable(rows, { pageSize: 15 });
  const today = new Date().toDateString();
  const day = (d) => (new Date(d).toDateString() === today ? 'Today' : new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  return (
    <>
      <PageHeader crumb="System" title="Audit log" sub="The latest 200 actions recorded by the system: who did what, and when.">
        <button className="btn paper" onClick={reload}><RefreshCw size={15} /> Refresh</button>
        <button className="btn paper" onClick={() => downloadCsv('audit-log.csv', [['Time', 'User', 'Action', 'Detail'], ...rows.map((l) => [new Date(l.created_at).toISOString(), l.user_name, l.action, l.detail])])}><Download size={15} /> Export</button>
      </PageHeader>
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search user, action or detail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit log" /></div>
          <div className="row" style={{ gap: 6 }}>{Object.entries(GROUPS).map(([k, v]) => <button key={k} className={`chip ${g === k ? 'brand' : ''}`} style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }} onClick={() => setG(k)} aria-pressed={g === k}>{v}</button>)}</div>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <Empty title="Nothing matches" /> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>{t.rows.map((l) => <tr key={l.id}><td className="mono small" style={{ whiteSpace: 'nowrap' }}>{day(l.created_at)} {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td>{l.user_name}</td><td><Chip kind="info">{l.action.replace(/_/g, ' ').toLowerCase()}</Chip></td><td className="muted small">{l.detail}</td></tr>)}</tbody>
            </table></div>
            <Pager t={t} />
          </>
        )}
      </div>
    </>
  );
}
