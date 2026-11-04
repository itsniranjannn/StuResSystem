import { useState } from 'react';
import { motion } from 'framer-motion';

// Anka mark: a rounded blue tile holding three rising bars (marks) and a crimson tick that drops onto the tallest one.
// Entrance: tile settles, bars spring up in sequence, tick drops and draws itself. Idle: a soft light sweep crosses every few seconds.
// Hover / tap: the bars ripple. With reduced motion the static mark shows (animation is disabled globally in CSS).
export function LogoMark({ size = 40, animated = true }) {
  const [wave, setWave] = useState(0);
  const id = `lm${size}`;
  const bars = [{ x: 15, h: 14, o: 0.55 }, { x: 28, h: 24, o: 0.8 }, { x: 41, h: 35, o: 1 }];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="Anka" onHoverStart={() => setWave((w) => w + 1)} onTap={() => setWave((w) => w + 1)} style={{ overflow: 'visible', cursor: 'pointer', flexShrink: 0 }}
      initial={animated ? { scale: 0.8, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2a4f94" /><stop offset="1" stopColor="#0f2147" /></linearGradient>
        <clipPath id={`${id}c`}><rect x="2" y="2" width="68" height="68" rx="19" /></clipPath>
      </defs>
      <rect x="2" y="2" width="68" height="68" rx="19" fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}c)`}>
        <path d="M2 60 C 18 52, 28 56, 40 46 S 62 40, 72 44 V72 H2Z" fill="#fff" opacity="0.08" />
        {bars.map((b, i) => (
          <motion.rect key={`${b.x}-${wave}`} x={b.x} y={58 - b.h} width="11" height={b.h} rx="3.5" fill="#fff" opacity={b.o} style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
            initial={animated || wave ? { scaleY: 0 } : false} animate={{ scaleY: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 13, delay: wave ? i * 0.07 : 0.2 + i * 0.12 }} />
        ))}
        {animated && <motion.rect x="-24" y="-8" width="14" height="96" fill="#fff" opacity="0.28" style={{ rotate: 20 }} animate={{ x: [-24, 100] }} transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4.5, delay: 1.8 }} />}
      </g>
      <motion.circle cx="53.5" cy="17" r="8.5" fill="#e0a94a" stroke="#0f2147" strokeWidth="2.5" initial={animated ? { cy: -16, scale: 0.5 } : false} animate={{ cy: [-16, 24, 14, 19, 17], scale: 1 }} transition={{ duration: 0.9, delay: 0.75, ease: 'easeOut' }} />
      <motion.path d="M49.2 17.2 l3 3.1 l5.6-6" fill="none" stroke="#0f2147" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" initial={animated ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ delay: 1.6, duration: 0.4 }} />
    </motion.svg>
  );
}

export function Logo({ size = 40, word = true, animated = true, light = false }) {
  const letters = 'Anka'.split('');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.3, color: light ? '#fff' : 'var(--ink)' }}>
      <LogoMark size={size} animated={animated} />
      {word && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ display: 'inline-flex', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: size * 0.6, letterSpacing: '-0.06em' }} aria-label="Anka">
            {letters.map((l, i) => (
              <motion.span key={i} initial={animated ? { y: 10, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300, damping: 18 }}>{l}</motion.span>
            ))}
          </span>
          <motion.span className="ne" style={{ fontSize: size * 0.22, fontWeight: 700, opacity: 0.55, marginTop: size * 0.06, letterSpacing: '0.2em' }} initial={animated ? { opacity: 0 } : false} animate={{ opacity: 0.7 }} transition={{ delay: 1 }}>RESULT SYSTEM</motion.span>
        </span>
      )}
    </span>
  );
}

// Large emblem for hero/auth: the mark inside two slow orbit rings.
export function LogoEmblem({ size = 120 }) {
  const d = size * 2.1;
  return (
    <div style={{ position: 'relative', width: d, height: d, display: 'grid', placeItems: 'center' }} aria-hidden="true">
      {[0.5, 0.78].map((k, i) => (
        <motion.svg key={k} width={d * (0.55 + k * 0.45)} height={d * (0.55 + k * 0.45)} viewBox="0 0 100 100" style={{ position: 'absolute' }} animate={{ rotate: i ? -360 : 360 }} transition={{ duration: 40 + i * 20, repeat: Infinity, ease: 'linear' }}>
          <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray={i ? '1 3' : '0.5 0'} opacity="0.35" />
          <circle cx={i ? 50 : 99} cy={i ? 1 : 50} r="2.2" fill="#e0a94a" />
        </motion.svg>
      ))}
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}><LogoMark size={size} /></motion.div>
    </div>
  );
}
