import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogoEmblem } from '../components/Logo.jsx';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
      <div>
        <LogoEmblem size={90} />
        <motion.h1 style={{ fontSize: 'clamp(4rem,14vw,9rem)', lineHeight: 1 }} animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity }}>404</motion.h1>
        <p className="serif" style={{ fontSize: '2rem', margin: '10px 0 20px' }}>This page failed the exam.</p>
        <Link className="btn gold" to="/">Back home</Link>
      </div>
    </div>
  );
}
