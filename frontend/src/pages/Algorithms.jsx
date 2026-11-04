import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Play } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot } from 'recharts';
import { PageHeader, Seg } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { Logo } from '../components/Logo.jsx';

// Live copies of the production algorithms (see backend/utils/algorithms.js and ranking.js) so they can be explored in the browser.
function mergeSortSteps(arr, cmp) {
  let comparisons = 0;
  const sort = (a) => {
    if (a.length <= 1) return a;
    const mid = a.length >> 1;
    const l = sort(a.slice(0, mid));
    const r = sort(a.slice(mid));
    const out = [];
    let i = 0, j = 0;
    while (i < l.length && j < r.length) { comparisons++; out.push(cmp(l[i], r[j]) <= 0 ? l[i++] : r[j++]); }
    return out.concat(l.slice(i), r.slice(j));
  };
  return { sorted: sort(arr), comparisons };
}
function regress(points) {
  const n = points.length; if (n < 2) return null;
  const sx = points.reduce((a, p) => a + p[0], 0), sy = points.reduce((a, p) => a + p[1], 0);
  const sxx = points.reduce((a, p) => a + p[0] * p[0], 0), sxy = points.reduce((a, p) => a + p[0] * p[1], 0);
  const den = n * sxx - sx * sx; if (!den) return null;
  const slope = (n * sxy - sx * sy) / den, intercept = (sy - slope * sx) / n;
  const my = sy / n, tot = points.reduce((a, p) => a + (p[1] - my) ** 2, 0), res = points.reduce((a, p) => a + (p[1] - (intercept + slope * p[0])) ** 2, 0);
  return { slope, intercept, r2: tot ? 1 - res / tot : 1 };
}

const CATALOG = [
  ['Merge sort ranking', 'Ranking', 'O(n log n) time, O(n) space, stable', 'Orders every class by GPA, then total marks, then name. Stability keeps equal students in a predictable order.', 'backend/utils/ranking.js'],
  ['Competition ranking (1, 2, 2, 4)', 'Ranking', 'O(n)', 'Equal scores share a rank and the next rank is skipped, exactly like official merit lists.', 'backend/utils/ranking.js'],
  ['Binary search on grade bands', 'Grading', 'O(log b) per grade', 'Finds the letter grade for a percentage in the sorted band table of the TU, NEB or division scheme.', 'backend/utils/grading.js'],
  ['Weighted GPA / CGPA', 'Grading', 'O(s)', 'GPA = Σ(grade point × credit) / Σ credit; CGPA weights each term by its credits.', 'backend/utils/grading.js'],
  ['Min-heap Top-K', 'Selection', 'O(n log k)', 'Finds the toppers of a class in one scan keeping only k items in a binary heap.', 'backend/utils/algorithms.js'],
  ['Descriptive statistics', 'Analytics', 'O(n log n)', 'Mean, median, mode, standard deviation and quartiles of any class or subject.', 'backend/utils/algorithms.js'],
  ['z-score and percentile rank', 'Analytics', 'O(log n) per query', 'Shows how far above or below the cohort a student stands; percentile via binary search on sorted GPAs.', 'backend/utils/algorithms.js'],
  ['Least-squares linear regression', 'Prediction', 'O(n)', 'Fits GPA against term number to forecast next term and report confidence (R²).', 'backend/utils/algorithms.js'],
  ['Pearson correlation', 'Analytics', 'O(n)', 'Measures whether internal marks predict external exam marks for a subject (assessment quality).', 'backend/utils/algorithms.js'],
  ["K-means clustering (Lloyd's)", 'Segmentation', 'O(n·k·i)', 'Groups students into high performers, steady middle and needs support using GPA and attendance.', 'backend/utils/algorithms.js'],
  ['Early-warning risk score', 'Prediction', 'O(1) per student', 'Transparent weighted rules (attendance < 80%, failures, falling GPA, weak internals) with a reason for every point.', 'backend/utils/algorithms.js'],
  ['Hashing and tokens', 'Security', 'bcrypt cost 10; SHA-256', 'Passwords are bcrypt-hashed; reset tokens are random, single-use, stored only as SHA-256 hashes and expire in 30 minutes.', 'backend/routes/auth.js'],
  ['Queue with retry', 'Email', 'O(1) enqueue', 'Emails are persisted first, then sent by a background worker with 3 attempts, so publishing never blocks.', 'backend/utils/mailer.js'],
];


const SAMPLE = [['Asha', 3.82, 462], ['Bikash', 3.4, 431], ['Chandra', 3.82, 470], ['Dipa', 2.9, 380], ['Eshan', 3.4, 431], ['Firoj', 1.8, 250], ['Gita', 3.1, 400]];

export default function Algorithms() {
  const { user } = useAuth();
  const [rows, setRows] = useState(SAMPLE.map(([name, gpa, total]) => ({ name, gpa, total, status: gpa < 2 ? 'fail' : 'pass' })));
  const [series, setSeries] = useState([[1, 2.9], [2, 3.1], [3, 3.0], [4, 3.4], [5, 3.5], [6, 3.7]]);
  const [mode, setMode] = useState('rank');
  const [ran, setRan] = useState(null);

  const run = () => {
    const cmp = (a, b) => (a.status === b.status ? 0 : a.status === 'pass' ? -1 : 1) || b.gpa - a.gpa || b.total - a.total || a.name.localeCompare(b.name);
    const { sorted, comparisons } = mergeSortSteps(rows, cmp);
    let prev = null, pr = 0;
    setRan({ comparisons, out: sorted.map((r, i) => { const tie = prev && prev.gpa === r.gpa && prev.total === r.total && prev.status === r.status; const rank = tie ? pr : i + 1; prev = r; pr = rank; return { ...r, rank }; }) });
  };
  const shuffle = () => { setRows((r) => [...r].sort(() => Math.random() - 0.5)); setRan(null); };
  const edit = (i, k, v) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: Number(v), status: k === 'gpa' ? (Number(v) < 2 ? 'fail' : 'pass') : x.status } : x))); setRan(null); };
  const reg = useMemo(() => regress(series), [series]);
  const chart = useMemo(() => [...series.map(([x, y]) => ({ x, y, fit: reg ? +(reg.intercept + reg.slope * x).toFixed(2) : null })), reg ? { x: series.length + 1, fit: +Math.min(4, reg.intercept + reg.slope * (series.length + 1)).toFixed(2) } : null].filter(Boolean), [series, reg]);
  const pred = reg ? Math.max(0, Math.min(4, reg.intercept + reg.slope * (series.length + 1))) : null;

  return (
    <div style={user ? undefined : { padding: '16px clamp(16px,5vw,64px)', maxWidth: 1200, margin: '0 auto' }}>
      {!user && <div className="row between" style={{ marginBottom: 20 }}><Link to="/" style={{ textDecoration: 'none' }}><Logo size={36} /></Link><Link to="/login" className="btn paper sm">Sign in</Link></div>}
      <PageHeader crumb="Under the hood" title="Algorithms explorer" sub="Every number in Anka comes from an algorithm you can inspect. Try them live, then read the source file named on each card." />
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Live sandbox</h3>
          <Seg value={mode} onChange={setMode} options={[{ value: 'rank', label: 'Merge-sort ranking' }, { value: 'reg', label: 'GPA forecast (regression)' }]} label="Demo" />
        </div>
        {mode === 'rank' ? (
          <div className="grid-2">
            <div>
              <p className="muted small" style={{ marginBottom: 10 }}>Edit any GPA or total, shuffle the order, then run the real ranking algorithm. Failing students (GPA below 2.0 here) always rank last.</p>
              <div className="table-wrap"><table><thead><tr><th>Student</th><th className="num">GPA</th><th className="num">Total</th></tr></thead>
                <tbody>{rows.map((r, i) => (<tr key={r.name}><td>{r.name}</td><td className="num"><input className="input marks-input" type="number" step="0.1" min="0" max="4" value={r.gpa} onChange={(e) => edit(i, 'gpa', e.target.value)} aria-label={`GPA of ${r.name}`} /></td><td className="num"><input className="input marks-input" type="number" value={r.total} onChange={(e) => edit(i, 'total', e.target.value)} aria-label={`Total of ${r.name}`} /></td></tr>))}</tbody></table></div>
              <div className="row" style={{ marginTop: 12 }}><button className="btn paper" onClick={shuffle}><Shuffle size={16} /> Shuffle</button><button className="btn gold" onClick={run}><Play size={16} /> Run ranking</button></div>
            </div>
            <div>
              <AnimatePresence mode="wait">
                {ran ? (
                  <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="row between"><b>Merit list</b><span className="chip info">{ran.comparisons} comparisons for n = {rows.length}</span></div>
                    <div style={{ marginTop: 10 }}>
                      {ran.out.map((r, i) => (
                        <motion.div key={r.name} layout initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }} className="row" style={{ padding: '8px 0', borderBottom: '2px dashed var(--line)' }}>
                          <span className={`medal ${r.rank <= 3 ? `r${r.rank}` : ''}`}>{r.rank}</span><b style={{ flex: 1 }}>{r.name}</b><span className="mono">{r.gpa.toFixed(2)}</span>{r.status === 'fail' && <span className="chip fail">fail</span>}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : <motion.div key="e" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><b>Press "Run ranking"</b>Ties share a rank (1, 2, 2, 4).</motion.div>}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="grid-2">
            <div>
              <p className="muted small" style={{ marginBottom: 10 }}>Change the past GPAs and watch the least-squares line and next-term forecast update instantly.</p>
              {series.map(([x, y], i) => (
                <div key={x} className="row" style={{ marginBottom: 8 }}><span style={{ width: 70, fontWeight: 700 }}>Term {x}</span>
                  <input type="range" min="0" max="4" step="0.05" value={y} onChange={(e) => setSeries((s) => s.map((p, j) => (j === i ? [p[0], Number(e.target.value)] : p)))} style={{ flex: 1, accentColor: 'var(--brand)' }} aria-label={`GPA term ${x}`} /><span className="mono" style={{ width: 40 }}>{y.toFixed(2)}</span></div>
              ))}
              {reg && <div className="row" style={{ marginTop: 12 }}><span className="chip info">slope {reg.slope.toFixed(3)} / term</span><span className="chip info">R² {reg.r2.toFixed(2)}</span><span className="chip pass">next GPA ≈ {pred.toFixed(2)}</span></div>}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart}><CartesianGrid stroke="var(--line)" strokeDasharray="4 4" /><XAxis dataKey="x" stroke="var(--ink-2)" /><YAxis domain={[0, 4]} stroke="var(--ink-2)" /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                <Line dataKey="y" stroke="var(--crimson)" strokeWidth={3} dot={{ r: 5, fill: 'var(--amber)', stroke: 'var(--surface)', strokeWidth: 2 }} connectNulls={false} /><Line dataKey="fit" stroke="var(--brand)" strokeWidth={3} strokeDasharray="6 4" dot={false} />
                {pred != null && <ReferenceDot x={series.length + 1} y={pred} r={8} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />}</LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <h3 style={{ margin: '28px 0 14px', fontSize: '1.4rem' }}>Algorithm catalog</h3>
      <div className="grid-3">
        {CATALOG.map(([name, tag, cx, desc, file], i) => (
          <motion.div key={name} className="card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }} whileHover={{ y: -4 }}>
            <div className="row between"><span className="chip info">{tag}</span><span className="mono small muted">{cx}</span></div>
            <h3 style={{ margin: '10px 0 6px' }}>{name}</h3><p className="muted small">{desc}</p>
            <div className="mono small" style={{ marginTop: 10, color: 'var(--brand)' }}>{file}</div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
