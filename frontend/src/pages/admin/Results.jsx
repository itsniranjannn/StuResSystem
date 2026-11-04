import { useMemo, useState } from 'react';
import { ArrowUpRight, Calculator, Check, Download, Eye, EyeOff, Mail, Search, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import Marksheet from '../../components/Marksheet.jsx';
import { Chip, Empty, Meter, Modal, PageHeader, Pager, Select, Seg, SortTh, Spinner, Switch, statusKind, termName, useConfirm, useLoad, useTable, useToast } from '../../components/ui.jsx';
import api, { errMsg, get, post } from '../../lib/api';

const stage = (b) => {
  const eligible = b.students - b.incomplete;
  if (b.incomplete === b.students) return 0;                         // nothing calculable yet
  if (eligible > 0 && b.published_count >= eligible) return 3;       // published
  if (b.incomplete > 0 && b.published_count === 0) return 1;         // some marks still missing
  return 2;                                                          // entered and calculated, awaiting publication
};
const STEPS = ['Marks entered', 'Calculated', 'Published'];

function Pipeline({ at }) {
  return (
    <div className="row" style={{ gap: 0, flexWrap: 'nowrap', margin: '4px 0 14px' }} aria-label={`Stage: ${STEPS[Math.min(at, 3) - 1] || 'collecting marks'}`}>
      {STEPS.map((s, i) => {
        const done = at > i + 0; const cur = at === i + 1 && at < 3;
        return (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 4, justifyItems: 'center', flex: '0 0 auto' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.68rem', fontWeight: 800, border: `2px solid ${done || cur ? 'var(--brand)' : 'var(--line-strong)'}`, background: done ? 'var(--brand)' : 'transparent', color: done ? 'var(--on-brand)' : 'var(--muted)' }}>{done ? <Check size={12} /> : i + 1}</span>
              <span className="small" style={{ fontSize: '0.68rem', color: done || cur ? 'var(--ink)' : 'var(--muted)', fontWeight: 650 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: at > i + 1 ? 'var(--brand)' : 'var(--line)', margin: '0 6px 16px' }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminResults() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pid, setPid] = useState('');
  const [filter, setFilter] = useState('all');
  const progs = useLoad(() => get('/admin/programs'), []);
  const mail = useLoad(() => get('/admin/mail'), []);
  const { data, loading, reload } = useLoad(() => get('/admin/results/batches', { program_id: pid || undefined }), [pid]);
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [pub, setPub] = useState(null);
  const [notify, setNotify] = useState(true);
  const [q, setQ] = useState('');
  const list = useLoad(() => (open ? get('/admin/results', { program_id: open.program_id, semester: open.semester, exam_year: open.exam_year }) : Promise.resolve(null)), [open?.program_id, open?.semester, open?.exam_year]);
  const rows = useMemo(() => (list.data?.results || []).filter((r) => `${r.student_name} ${r.roll_no}`.toLowerCase().includes(q.toLowerCase())).map((r) => ({ ...r, name: r.student_name, gpaN: Number(r.gpa), rank: r.class_rank ?? 9999 })), [list.data, q]);
  const t = useTable(rows, { pageSize: 8, sort: { key: 'rank', dir: 'asc' } });
  const batches = (data?.batches || []).filter((b) => filter === 'all' || (filter === 'draft' ? stage(b) < 3 : stage(b) === 3));
  const plist = progs.data?.programs || [];
  const base = (b) => ({ program_id: b.program_id, semester: b.semester, exam_year: b.exam_year });
  const done = () => { reload(); list.reload(); };

  const recalc = async (b) => { try { const d = await post('/admin/results/calculate', base(b)); toast(`Recalculated ${d.calculated} results`); done(); } catch (e) { toast(errMsg(e), 'error'); } };
  const doPublish = async () => { try { const d = await post('/admin/results/publish', { ...base(pub), publish: true, notify }); toast(`Published ${d.affected} results${d.queued ? `, ${d.queued} emails queued` : ''}`); setPub(null); done(); } catch (e) { toast(errMsg(e), 'error'); } };
  const unpublish = async (b) => {
    if (!(await confirm({ title: 'Unpublish this batch?', message: 'Students will no longer see these results until you publish again.', confirm: 'Unpublish' }))) return;
    try { const d = await post('/admin/results/publish', { ...base(b), publish: false }); toast(`Unpublished ${d.affected} results`); done(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const promote = async (b) => {
    if (!(await confirm({ title: 'Promote passed students?', message: `Everyone who passed ${termName(b, b.semester)} moves up one term. Students who failed stay to clear their backlog.`, confirm: 'Promote' }))) return;
    try { const d = await post('/admin/results/promote', base(b)); toast(`Promoted ${d.promoted} students`); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const csv = async (b) => {
    const r = await api.get('/admin/results/export.csv', { params: base(b), responseType: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `results-${b.program}-t${b.semester}-${b.exam_year}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const view = async (r) => { try { setSheet(await get(`/results/marksheet/${r.student_id}/${r.semester}/${r.exam_year}`)); } catch (e) { toast(errMsg(e), 'error'); } };

  return (
    <>
      <PageHeader crumb="Results" title="Results workflow" sub="Each batch moves through three steps. Students see nothing until you publish.">
        <Select value={pid} onChange={setPid} label="Program" options={[{ value: '', label: 'All programs' }, ...plist.map((p) => ({ value: p.id, label: p.name, sub: p.code }))]} style={{ minWidth: 'min(240px, 100%)' }} />
        <Seg value={filter} onChange={setFilter} label="Status" options={[{ value: 'all', label: 'All' }, { value: 'draft', label: 'Needs action' }, { value: 'live', label: 'Published' }]} />
      </PageHeader>
      {loading ? <Spinner /> : batches.length === 0 ? <div className="card"><Empty title="No batches here">Teachers need to enter marks first. Batches appear automatically.</Empty></div> : (
        <div className="grid-3">
          {batches.map((b, i) => {
            const at = stage(b); const eligible = b.students - b.incomplete; const passRate = eligible ? Math.round((b.passed / eligible) * 100) : 0;
            return (
              <motion.div key={`${b.program_id}-${b.semester}-${b.exam_year}`} className="card lift" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <div className="row between"><Chip kind="info">{b.program}</Chip><Chip kind={at === 3 ? 'pass' : b.published_count > 0 ? 'warn' : 'incomplete'}>{at === 3 ? 'published' : b.published_count > 0 ? 'partly published' : 'draft'}</Chip></div>
                <h3 style={{ margin: '12px 0 2px', fontSize: '1.25rem' }}>{termName(b, b.semester)} · {b.exam_year}</h3>
                <div className="muted small" style={{ marginBottom: 12 }}>{b.students} students · average GPA {b.avg_gpa ?? '-'}</div>
                <Pipeline at={at} />
                <div className="row between small"><span>Pass rate</span><b className="mono">{passRate}%</b></div>
                <Meter value={passRate} color="var(--good)" />
                <div className="row small muted" style={{ margin: '8px 0 14px', gap: 10 }}><span>{b.passed} passed</span><span>{b.failed} failed</span>{b.incomplete > 0 && <span style={{ color: 'var(--warn)' }}>{b.incomplete} incomplete</span>}</div>
                <div className="row" style={{ gap: 6 }}>
                  {at === 3 ? <button className="btn paper sm" onClick={() => unpublish(b)}><EyeOff size={14} /> Unpublish</button> : <button className="btn sm" onClick={() => setPub(b)}><Send size={14} /> Publish</button>}
                  <button className="btn paper sm" onClick={() => setOpen(b)}><Eye size={14} /> Review</button>
                  <button className="btn paper sm" onClick={() => recalc(b)}><Calculator size={14} /> Recalculate</button>
                </div>
                <div className="row" style={{ gap: 4, marginTop: 8 }}>
                  <button className="btn ghost sm" onClick={() => csv(b)}><Download size={14} /> Export CSV</button>
                  {at === 3 && <button className="btn ghost sm" onClick={() => promote(b)} aria-label="Promote passed students"><ArrowUpRight size={14} /> Promote passed</button>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!pub} onClose={() => setPub(null)} title={pub ? `Publish ${pub.program} ${termName(pub, pub.semester)} · ${pub.exam_year}` : ''}>
        {pub && (<>
          <p>This makes <b>{pub.students - pub.incomplete}</b> results visible to students and in the public result search.{pub.incomplete > 0 && ` ${pub.incomplete} incomplete result(s) stay hidden until all marks are entered.`}</p>
          <div className="card flat tint" style={{ margin: '16px 0' }}>
            <Switch checked={notify} onChange={setNotify} label="Email every student and guardian their result" />
            <p className="muted small" style={{ marginTop: 8 }}><Mail size={13} style={{ verticalAlign: -2 }} /> {mail.data?.configured ? `Sends from ${mail.data.sender}. Emails are queued and delivered in the background.` : 'Email is not set up yet, so messages will be logged as skipped. Set it up in the Mail center.'}</p>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn paper" onClick={() => setPub(null)}>Cancel</button><button className="btn" onClick={doPublish}><Send size={15} /> Publish now</button></div>
        </>)}
      </Modal>

      <Modal wide open={!!open} onClose={() => { setOpen(null); setSheet(null); setQ(''); }} title={open ? `${open.program} · ${termName(open, open.semester)} · ${open.exam_year}` : ''}>
        {sheet ? (<><button className="btn paper sm no-print" onClick={() => setSheet(null)}>Back to list</button><div style={{ marginTop: 12 }}><Marksheet sheet={sheet} /></div></>)
          : list.loading || !list.data ? <Spinner /> : (
            <>
              <div style={{ position: 'relative', marginBottom: 12, maxWidth: 340 }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search name or symbol" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search results" /></div>
              <div className="table-wrap"><table>
                <thead><tr><SortTh t={t} k="rank">Rank</SortTh><th>Symbol</th><SortTh t={t} k="name">Name</SortTh><SortTh t={t} k="gpaN" num>GPA</SortTh><th>Result</th><th /></tr></thead>
                <tbody>{t.rows.map((r) => (
                  <tr key={r.id} className="click" onClick={() => view(r)}><td className="mono">{r.class_rank ?? '-'}</td><td className="mono">{r.roll_no}</td><td>{r.student_name}</td><td className="num">{Number(r.gpa).toFixed(2)}</td>
                    <td><Chip kind={statusKind(r.status)}>{r.status}</Chip> {r.published ? <Chip kind="pass">live</Chip> : <Chip kind="warn">draft</Chip>}</td><td><button className="btn ghost sm">Marksheet</button></td></tr>))}</tbody>
              </table></div>
              <Pager t={t} />
            </>
          )}
      </Modal>
    </>
  );
}
