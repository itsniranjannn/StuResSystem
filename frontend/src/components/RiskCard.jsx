import { motion } from 'framer-motion';
import { Chip } from './ui.jsx';

// Semi-circular gauge for the 0-100 early-warning score, with the reasons that produced it.
export default function RiskCard({ risk }) {
  const color = risk.level === 'high' ? 'var(--bad)' : risk.level === 'medium' ? 'var(--warn)' : 'var(--good)';
  const len = 157; // half circumference of r=50
  return (
    <div className="row" style={{ gap: 22, alignItems: 'center' }}>
      <div style={{ width: 150, textAlign: 'center' }}>
        <svg viewBox="0 0 120 70" width="150" aria-label={`Risk score ${risk.score} of 100`}>
          <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
          <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="var(--line)" strokeWidth="18" strokeLinecap="round" opacity="0.15" />
          <motion.path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={len} initial={{ strokeDashoffset: len }} animate={{ strokeDashoffset: len * (1 - risk.score / 100) }} transition={{ duration: 1.2, ease: 'easeOut' }} />
          <text x="60" y="58" textAnchor="middle" style={{ font: '800 26px var(--font-display)', fill: 'var(--ink)' }}>{risk.score}</text>
        </svg>
        <Chip kind={risk.level}>{risk.level} risk</Chip>
      </div>
      <ul style={{ flex: 1, minWidth: 200, listStyle: 'none' }} className="stack small">
        {risk.reasons.length === 0 ? <li className="muted">No warning signs. Keep it up.</li> : risk.reasons.map((r) => (
          <li key={r.text} className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}><span className="chip warn mono">+{r.points}</span><span>{r.text}</span></li>
        ))}
      </ul>
    </div>
  );
}
