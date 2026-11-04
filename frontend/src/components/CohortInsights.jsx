import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Gauge, Users, Link2, Trophy } from 'lucide-react';
import { Chip, Empty, Tile } from './ui.jsx';
import RiskCard from './RiskCard.jsx';
import { chartTip } from '../pages/student/Home.jsx';

const GC = ['var(--s1)', 'var(--s2)', 'var(--s4)']; // blue, gold, rose: validated categorical order

// Cohort analytics shared by the admin and teacher insight pages.
export default function CohortInsights({ d, onAlert, alertBusy }) {
  if (!d) return null;
  if (d.empty) return <div className="card"><Empty title="No calculated results for this term yet">Enter marks and recalculate first.</Empty></div>;
  const dist = Object.entries(d.distribution || {}).map(([k, v]) => ({ k, v }));
  return (
    <>
      <div className="grid-4">
        <Tile label="Students" value={d.n} icon={Users} color="var(--brand)" hint={`pass rate ${d.pass_rate}%`} />
        <Tile label="Mean GPA" value={d.stats.mean} decimals={2} icon={Gauge} color="var(--amber)" delay={0.07} hint={`median ${d.stats.median}, σ ${d.stats.std}`} />
        <Tile label="Highest GPA" value={d.stats.max} decimals={2} icon={Trophy} color="var(--crimson)" delay={0.14} hint={`lowest ${d.stats.min}`} />
        <Tile label="Internal ↔ external" value={d.correlation ?? 0} decimals={2} icon={Link2} color="var(--good)" delay={0.21} hint={d.correlation == null ? 'not enough data' : d.correlation > 0.6 ? 'strong agreement (Pearson r)' : d.correlation > 0.3 ? 'moderate agreement (Pearson r)' : 'weak agreement: review assessment'} />
      </div>
      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card"><h3>Performance groups (k-means)</h3><p className="sub">Students clustered by GPA and attendance, converged in {d.kmeans_iterations} iterations.</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ left: -10 }}><CartesianGrid stroke="var(--line)" strokeDasharray="4 4" /><XAxis type="number" dataKey="attendance" name="Attendance %" domain={[40, 100]} stroke="var(--ink-2)" /><YAxis type="number" dataKey="gpa" name="GPA" domain={[0, 4]} stroke="var(--ink-2)" /><ZAxis range={[90, 90]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={chartTip} formatter={(v, n) => [v, n]} labelFormatter={() => ''} />
              {[0, 1, 2].map((c) => <Scatter key={c} name={d.clusters[c]?.name} data={d.points.filter((p) => p.cluster === c)} fill={GC[c]} stroke="var(--surface)" />)}</ScatterChart>
          </ResponsiveContainer>
          <div className="row">{d.clusters.map((c, i) => <span key={c.name} className="chip" style={{ background: `color-mix(in srgb, ${GC[i]} 16%, transparent)`, color: GC[i] }}>{c.name}: {c.size} · GPA {c.avg_gpa} · {c.avg_attendance}%</span>)}</div>
        </div>
        <div className="card"><h3>Toppers (min-heap top-5)</h3>
          <table><tbody>{d.toppers.map((t, i) => <tr key={t.roll_no}><td><span className={`medal ${i < 3 ? `r${i + 1}` : ''}`}>{i + 1}</span></td><td>{t.name}</td><td className="num">{t.gpa.toFixed(2)}</td><td className="num muted">{t.percentage}%</td></tr>)}</tbody></table>
          {dist.length > 0 && <><h3 style={{ marginTop: 18 }}>Division spread</h3>
            <ResponsiveContainer width="100%" height={130}><BarChart data={dist}><XAxis dataKey="k" stroke="var(--ink-2)" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} stroke="var(--ink-2)" width={28} /><Tooltip contentStyle={chartTip} /><Bar dataKey="v" stroke="var(--surface)" strokeWidth={2} radius={[6, 6, 0, 0]}>{dist.map((x) => <Cell key={x.k} fill={x.k === 'Fail' ? 'var(--bad)' : 'var(--s1)'} />)}</Bar></BarChart></ResponsiveContainer></>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <div className="row between"><h3 style={{ margin: 0 }}>Students who need support</h3>{onAlert && d.at_risk.length > 0 && <button className="btn coral sm" onClick={onAlert} disabled={alertBusy}>Email support alerts ({d.at_risk.length})</button>}</div>
        {d.at_risk.length === 0 ? <Empty title="Nobody is at risk">No medium or high risk signals in this class.</Empty> : (
          <div className="stack" style={{ marginTop: 14 }}>
            {d.at_risk.map((r) => (
              <div key={r.student_id} className="card flat tint" style={{ padding: 16 }}>
                <div className="row between" style={{ marginBottom: 10 }}><b>{r.name} <span className="mono muted small">{r.roll_no}</span></b><span className="row"><Chip kind="info">GPA {r.gpa.toFixed(2)}</Chip><Chip kind={r.attendance != null && r.attendance < 80 ? 'fail' : 'pass'}>att. {r.attendance ?? '-'}%</Chip></span></div>
                <RiskCard risk={r.risk} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
