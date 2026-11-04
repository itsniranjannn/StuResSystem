import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo, LogoEmblem } from '../components/Logo.jsx';
import { ThemeButton } from '../components/Shell.jsx';
import { ShieldCheck, Mail, Trophy } from 'lucide-react';
import { useInstitution } from '../lib/institution.jsx';

const POINTS = [[Trophy, 'Fair merit lists', 'GPA, NEB grades and divisions in one engine'], [ShieldCheck, 'Verifiable marksheets', 'QR code and 10-letter code on every result'], [Mail, 'Results by email', 'Students and guardians hear the moment you publish']];

export function AuthLayout({ title, sub, children }) {
  const { inst } = useInstitution();
  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <Link to="/" style={{ textDecoration: 'none' }}><Logo size={38} light /></Link>
        <div style={{ display: 'grid', placeItems: 'center' }}><LogoEmblem size={104} /></div>
        <div>
          {inst.name && <div style={{ opacity: 0.7, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{inst.name}</div>}
          <h2 className="display" style={{ fontSize: '1.8rem', maxWidth: 440, lineHeight: 1.15, marginTop: 8 }}>Marks that make <span className="serif" style={{ fontSize: '2.05rem' }}>sense.</span></h2>
          <div className="stack" style={{ marginTop: 24 }}>
            {POINTS.map(([Icon, t, d]) => (
              <div key={t} className="row" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={18} /></span>
                <div><div style={{ fontWeight: 700 }}>{t}</div><div style={{ opacity: 0.8, fontSize: '0.88rem' }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-side">
        <div style={{ width: 'min(450px,100%)' }}>
          <div className="row between" style={{ marginBottom: 18 }}><Link to="/" style={{ textDecoration: 'none' }}><span className="auth-mobile-logo"><Logo size={32} /></span></Link><ThemeButton /></div>
          <motion.div className="card auth-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1>{title}</h1>
            <p className="muted" style={{ marginBottom: 22 }}>{sub}</p>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
