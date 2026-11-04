import { useState } from 'react';
import CohortInsights from '../../components/CohortInsights.jsx';
import BatchPicker, { parseBatch } from '../../components/BatchPicker.jsx';
import { PageHeader, Spinner, useConfirm, useLoad, useToast } from '../../components/ui.jsx';
import { get, post, errMsg } from '../../lib/api';

export default function AdminInsights() {
  const toast = useToast();
  const confirm = useConfirm();
  const batches = useLoad(() => get('/admin/results/batches'), []);
  const [sel, setSel] = useState('');
  const [busy, setBusy] = useState(false);
  const b = parseBatch(sel);
  const ci = useLoad(() => (b ? get('/admin/insights', { program_id: b.program_id, semester: b.semester, exam_year: b.exam_year }) : Promise.resolve(null)), [sel]);
  const list = (batches.data?.batches || []).map((x) => ({ ...x }));
  const alert = async () => {
    const n = ci.data.at_risk.length;
    if (!(await confirm({ title: 'Email support alerts?', message: `This queues an academic-support email to ${n} student(s) at medium or high risk (and their guardians if on file). Each email lists the exact reasons.`, confirm: 'Send alerts' }))) return;
    setBusy(true);
    try { const d = await post('/admin/insights/alerts', { ...b }); toast(`${d.queued} email(s) queued. Track them in the Mail center.`); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader crumb="Insights" title="Cohort insights" sub="Statistics, performance groups and early-warning risk for any term. Every number is computed from marks and attendance.">
        <BatchPicker batches={list} value={sel} onChange={setSel} />
      </PageHeader>
      {batches.loading || ci.loading ? <Spinner /> : <CohortInsights d={ci.data} onAlert={alert} alertBusy={busy} />}
    </>
  );
}
