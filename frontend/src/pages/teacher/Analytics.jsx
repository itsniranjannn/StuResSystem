import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Gauge, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import CohortInsights from '../../components/CohortInsights.jsx';
import BatchPicker, { batchKey, parseBatch } from '../../components/BatchPicker.jsx';
import { Empty, PageHeader, Seg, Select, Spinner, Tile, termName, useLoad } from '../../components/ui.jsx';
import { get } from '../../lib/api';
import { chartTip } from '../student/Home.jsx';

const COLORS = ['#c2255c', '#c77a0a', '#c77a0a', '#8bb85a', '#1b8a52', '#2f5bd2', '#084f4f'];

export default function TeacherAnalytics() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('subject');
  const subs = useLoad(() => get('/teacher/subjects'), []);
  const subjectId = params.get('subject') || subs.data?.subjects?.[0]?.id;
  const marks = useLoad(() => (subjectId ? get(`/teacher/subjects/${subjectId}/marks`) : Promise.resolve(null)), [subjectId]);
  const year = marks.data?.year;
  const an = useLoad(() => (subjectId && year ? get(`/teacher/subjects/${subjectId}/analytics`, { year }) : Promise.resolve(null)), [subjectId, year]);
  const cohorts = useLoad(() => get('/teacher/cohorts'), []);
  const [sel, setSel] = useState('');
  const b = parseBatch(sel);
  const ci = useLoad(() => (b ? get('/teacher/insights', { program_id: b.program_id, semester: b.semester, exam_year: b.exam_year }) : Promise.resolve(null)), [sel]);
  if (subs.loading) return <Spinner />;
  const d = an.data;
  const batchList = (cohorts.data?.cohorts || []).map((c) => ({ ...c, semester: c.semester }));
  return (
    <>
      <PageHeader crumb="Insights" title="Class insights" sub="Subject statistics, and class-wide performance groups and at-risk students computed from real marks and attendance.">
        <Seg value={tab} onChange={setTab} options={[{ value: 'subject', label: 'My subject' }, { value: 'class', label: 'Whole class' }]} label="Scope" />
      </PageHeader>
      {tab === 'subject' ? (
        <>
          <div className="card" style={{ marginBottom: 18 }}><Select value={subjectId} onChange={(v) => setParams({ subject: v })} style={{ minWidth: 'min(340px, 100%)' }} label="Subject" options={subs.data.subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, sub: `${s.program} ${termName(s, s.semester)}` }))} /></div>
          {an.loading || marks.loading ? <Spinner /> : !d || d.empty ? <div className="card"><Empty title="No marks entered yet">Enter marks to see statistics.</Empty></div> : (
            <>
              <div className="grid-4">
                <Tile label="Class average" value={d.average} decimals={1} suffix="%" icon={Gauge} color="var(--brand)" hint={`median ${d.stats.median}%, σ ${d.stats.std}`} />
                <Tile label="Highest" value={d.highest.total} icon={ArrowUp} color="var(--amber)" delay={0.07} hint={d.highest.student_name} />
                <Tile label="Lowest" value={d.lowest.total} icon={ArrowDown} color="var(--crimson)" delay={0.14} hint={d.lowest.student_name} />
                <Tile label="Pass rate" value={d.pass_rate} suffix="%" icon={CheckCircle2} color="var(--good)" delay={0.21} hint={d.internal_external_correlation != null ? `internal↔external r = ${d.internal_external_correlation}` : ''} />
              </div>
              <div className="grid-2" style={{ marginTop: 22 }}>
                <div className="card"><h3>Score distribution</h3>
                  <ResponsiveContainer width="100%" height={260}><BarChart data={d.buckets}><CartesianGrid stroke="var(--line)" strokeDasharray="4 4" /><XAxis dataKey="label" stroke="var(--ink-2)" /><YAxis allowDecimals={false} stroke="var(--ink-2)" /><Tooltip contentStyle={chartTip} />
                    <Bar dataKey="count" stroke="var(--surface)" strokeWidth={2} radius={[8, 8, 0, 0]} animationDuration={1000}>{d.buckets.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar></BarChart></ResponsiveContainer>
                </div>
                <div className="card"><h3>Top performers (heap top-5)</h3><table><tbody>{d.top.map((t, i) => <tr key={t.roll_no}><td><span className={`medal ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span></td><td>{t.student_name}</td><td className="num">{t.total}</td></tr>)}</tbody></table></div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 18 }}><BatchPicker batches={batchList} value={sel} onChange={setSel} /></div>
          {ci.loading ? <Spinner /> : <CohortInsights d={ci.data} />}
        </>
      )}
    </>
  );
}
export { batchKey };
