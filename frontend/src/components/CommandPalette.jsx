import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';

// Ctrl/Cmd + K command palette: jump to any page or run a quick action, fully keyboard driven.
export default function CommandPalette({ open, onClose, items }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((x) => !s || `${x.label} ${x.group} ${x.keywords || ''}`.toLowerCase().includes(s));
  }, [q, items]);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => ref.current?.focus(), 30); } }, [open]);
  useEffect(() => setI(0), [q]);
  const run = (x) => { onClose(); if (x.to) nav(x.to); else x.run?.(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(list.length - 1, v + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
    else if (e.key === 'Enter' && list[i]) { e.preventDefault(); run(list[i]); }
    else if (e.key === 'Escape') onClose();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="card" style={{ width: 'min(620px,100%)', padding: 8, background: 'var(--surface)' }} initial={{ y: -20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, opacity: 0 }} role="dialog" aria-label="Command palette">
            <div className="row" style={{ flexWrap: 'nowrap', padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <Search size={18} color="var(--muted)" />
              <input ref={ref} className="input" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} placeholder="Search pages and actions" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} aria-label="Search" />
              <span className="kbd">esc</span>
            </div>
            <div className="cmd-list" role="listbox">
              {list.length === 0 && <div className="empty">Nothing matches &ldquo;{q}&rdquo;.</div>}
              {list.map((x, n) => (
                <div key={x.label + x.group} role="option" aria-selected={n === i} className={`cmd-item ${n === i ? 'active' : ''}`} onMouseEnter={() => setI(n)} onClick={() => run(x)}>
                  {x.icon && <x.icon size={17} />}<span style={{ flex: 1 }}>{x.label}</span><span className="chip">{x.group}</span>{n === i && <CornerDownLeft size={14} />}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
