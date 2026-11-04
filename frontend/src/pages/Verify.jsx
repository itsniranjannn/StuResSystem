import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, ShieldX, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { Spinner } from '../components/ui.jsx';
import { get } from '../lib/api';
import { useI18n } from '../lib/i18n.jsx';

export default function Verify() {
  const { code } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const [input, setInput] = useState(code || '');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!code) { setRes(null); return; }
    setBusy(true);
    get(`/results/public/verify/${encodeURIComponent(code)}`).then(setRes).catch(() => setRes({ valid: false })).finally(() => setBusy(false));
  }, [code]);
  return (
    <div style={{ padding: '16px clamp(16px,5vw,64px) 60px', maxWidth: 760, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 30 }}><Link to="/" style={{ textDecoration: 'none' }}><Logo size={36} /></Link><Link to="/result" className="btn paper sm">Check result</Link></div>
      <div className="crumb">Marksheet verification</div>
      <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>{t('verify.title', 'Is this marksheet genuine?')}</h1>
      <p className="muted" style={{ margin: '8px 0 20px' }}>Type the 10-character code printed under the QR on the marksheet, or scan the QR itself.</p>
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav(`/verify/${input.trim().toUpperCase()}`); }}>
        <input className="input mono" placeholder="e.g. K7M2QX9TBA" value={input} maxLength={10} onChange={(e) => setInput(e.target.value.toUpperCase())} aria-label="Verification code" />
        <button className="btn gold"><ShieldCheck size={18} /> Verify</button>
      </form>
      {busy && <div style={{ marginTop: 24 }}><Spinner /></div>}
      {res && !busy && (res.valid ? (
        <motion.div className="card" style={{ marginTop: 28, borderColor: 'var(--good)' }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
          <div className="row" style={{ gap: 14 }}>
            <motion.div animate={{ rotate: [0, -12, 12, 0] }} transition={{ delay: 0.3, duration: 0.6 }}><BadgeCheck size={54} color="var(--good)" /></motion.div>
            <div><h2 style={{ fontSize: '1.7rem', color: 'var(--good)' }}>{t('verify.valid', 'Genuine marksheet')}</h2><p className="muted">Issued by {res.institution.institution_name}</p></div>
          </div>
          <hr className="divider" />
          <div className="kv">
            <div><span>Student</span><b>{res.result.student_name}</b></div><div><span>Symbol no.</span><b className="mono">{res.result.roll_no}</b></div>
            <div><span>Program</span><b>{res.result.program}</b></div><div><span>Term</span><b>{res.result.term_name} · {res.result.exam_year}</b></div>
            <div><span>GPA</span><b>{Number(res.result.gpa).toFixed(2)} ({res.result.grade})</b></div><div><span>Result</span><b style={{ textTransform: 'capitalize' }}>{res.result.status}{res.result.division ? ` · ${res.result.division}` : ''}</b></div>
            <div><span>Class rank</span><b>{res.result.class_rank || '-'}</b></div><div><span>Published</span><b>{res.result.published_at ? new Date(res.result.published_at).toLocaleDateString() : '-'}</b></div>
          </div>
        </motion.div>
      ) : (
        <motion.div className="card" style={{ marginTop: 28, borderColor: 'var(--bad)' }} initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 0] }}>
          <div className="row" style={{ gap: 14 }}><ShieldX size={54} color="var(--bad)" /><div><h2 style={{ fontSize: '1.7rem', color: 'var(--bad)' }}>{t('verify.invalid', 'No such marksheet')}</h2><p className="muted">This code is not in our records. Treat the document with caution and contact the institution.</p></div></div>
        </motion.div>
      ))}
    </div>
  );
}
