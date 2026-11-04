import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot } from 'recharts';
import { Sparkles, Target, Gauge } from 'lucide-react';
import RiskCard from '../../components/RiskCard.jsx';
import { Empty, PageHeader, Spinner, Tile, useLoad } from '../../components/ui.jsx';
import { get } from '../../lib/api';
import { chartTip } from './Home.jsx';

export default function StudentInsights() {
  const { data: d, loading } = useLoad(() => get('/results/me/insights'), []);
  if (loading) return <Spinner />;
  const tn = (n) => `${d.term_label} ${n + d.term_offset}`;
  const chart = d.series.map(([x, y]) => ({ x: tn(x), gpa: y }));
  if (d.prediction) chart.push({ x: `${tn(d.prediction.term)} (forecast)`, forecast: d.prediction.gpa });
  return (
    <>
      <PageHeader crumb="Insights" title="Where am I heading?" sub="Computed from your published results and attendance. These are guidance, not predictions you must accept." />
      <div className="grid-3">
        <Tile label="Forecast next GPA" value={d.prediction?.gpa ?? 0} decimals={2} icon={Sparkles} color="var(--brand)" hint={d.prediction ? `confidence: ${d.prediction.confidence} (R² ${d.prediction.r2})` : 'needs at least two terms'} />
        <Tile label="Percentile in class" value={d.standing?.percentile ?? 0} decimals={0} icon={Target} color="var(--amber)" delay={0.08} hint={d.standing ? `z = ${d.standing.z}, class mean ${d.standing.cohort_mean}` : 'no result yet'} />
        <Tile label="Risk score" value={d.risk.score} icon={Gauge} color={d.risk.level === 'high' ? 'var(--bad)' : d.risk.level === 'medium' ? 'var(--warn)' : 'var(--good)'} delay={0.16} hint={`${d.risk.level} risk`} />
      </div>
      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card"><h3>GPA trend and forecast</h3>
          {chart.length < 2 ? <Empty>More published terms are needed for a forecast.</Empty> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chart}><CartesianGrid stroke="var(--line)" strokeDasharray="4 4" /><XAxis dataKey="x" stroke="var(--ink-2)" tick={{ fontSize: 11 }} /><YAxis domain={[0, 4]} stroke="var(--ink-2)" /><Tooltip contentStyle={chartTip} />
                <Line dataKey="gpa" stroke="var(--brand)" strokeWidth={3} dot={{ r: 5, fill: 'var(--amber)', stroke: 'var(--surface)', strokeWidth: 2 }} />
                <Line dataKey="forecast" stroke="var(--crimson)" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 7, fill: 'var(--crimson)', stroke: 'var(--surface)', strokeWidth: 2 }} /></LineChart>
            </ResponsiveContainer>)}
          <p className="muted small" style={{ marginTop: 8 }}>Method: least-squares linear regression over your term GPAs{d.prediction ? ` (slope ${d.prediction.slope} per term)` : ''}.</p>
        </div>
        <div className="card"><h3>Early-warning check</h3><RiskCard risk={d.risk} />
          <hr className="divider" />
          <div className="small"><b>Attendance:</b> {d.attendance.overall != null ? `${d.attendance.overall}% (needs ${d.attendance.required}%)` : 'not recorded yet'} · <b>Failed subjects:</b> {d.failed_subjects}</div>
        </div>
      </div>
      {d.standing && (
        <div className="card" style={{ marginTop: 22 }}><h3>Standing in your class ({tn(d.standing.term)})</h3>
          <p>Your GPA <b>{d.standing.gpa.toFixed(2)}</b> is {d.standing.z >= 0 ? 'above' : 'below'} the class mean of {d.standing.cohort_mean} by {Math.abs(d.standing.z)} standard deviations, better than about <b>{d.standing.percentile}%</b> of {d.standing.cohort_size} classmates.</p>
        </div>
      )}
    </>
  );
}
