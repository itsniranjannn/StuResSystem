import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import Marksheet from '../components/Marksheet.jsx';
import { Chip, Spinner, statusKind } from '../components/ui.jsx';
import { get, errMsg } from '../lib/api';

export default function PublicResult() {
  const [params, setParams] = useSearchParams();
  const roll = params.get('roll') || '';
  const [input, setInput] = useState(roll);
  const [data, setData] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roll) return;
    setBusy(true); setError(''); setSheet(null);
    get('/results/public/search', { roll_no: roll }).then(setData).catch((e) => { setData(null); setError(errMsg(e)); }).finally(() => setBusy(false));
  }, [roll]);
  const open = (sem) => get('/results/public/marksheet', { roll_no: roll, semester: sem }).then(setSheet).catch((e) => setError(errMsg(e)));

  return (
    <div style={{ padding: '16px clamp(16px,5vw,64px) 60px', maxWidth: 1100, margin: '0 auto' }}>
      <div className="row between no-print" style={{ marginBottom: 30 }}><Link to="/" style={{ textDecoration: 'none' }}><Logo size={36} /></Link><Link to="/login" className="btn paper sm">Sign in</Link></div>
      <div className="crumb">Public result search</div>
      <h1 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)' }}>Check your <span className="hl">result</span></h1>
      <p className="muted" style={{ margin: '8px 0 20px' }}>No account needed. Only results published by the institution are shown.</p>
      <form className="search-bar no-print" onSubmit={(e) => { e.preventDefault(); setParams(input.trim() ? { roll: input.trim() } : {}); }}>
        <input className="input" placeholder="Symbol number" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Symbol number" />
        <button className="btn gold" type="submit"><Search size={18} /> Search</button>
      </form>
      {busy && <div style={{ marginTop: 24 }}><Spinner /></div>}
      {error && <p className="err" style={{ marginTop: 16 }} role="alert">{error}</p>}
      {data && !busy && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ fontSize: '1.5rem' }}>{data.student.student_name} <span className="muted mono small">· {data.student.roll_no} · {data.student.program}</span></h3>
          {data.results.length === 0 && <p className="muted" style={{ marginTop: 10 }}>No published results yet.</p>}
          <div className="grid-4 no-print" style={{ marginTop: 18 }}>
            {data.results.map((r, i) => (
              <motion.div key={r.semester} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -5 }}>
                <div className="card ticket" onClick={() => open(r.semester)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(r.semester)}>
                  <div className="lbl">{data.student.term_label} {r.semester + data.student.term_offset} · {r.exam_year}</div>
                  <div className="big">{Number(r.gpa).toFixed(2)}</div>
                  <div className="row" style={{ gap: 8 }}><Chip kind={statusKind(r.status)}>{r.division || r.status}</Chip>{r.class_rank && <span className="mono small muted">Rank {r.class_rank}</span>}</div>
                </div>
              </motion.div>
            ))}
          </div>
          {sheet && <div style={{ marginTop: 28 }}><Marksheet sheet={sheet} /></div>}
        </div>
      )}
    </div>
  );
}
