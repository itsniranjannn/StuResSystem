import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Check, ChevronDown, X, Inbox } from 'lucide-react';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} className={`toast ${t.type}`} initial={{ x: 90, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 90, opacity: 0 }}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Animated number ---------- */
export function Counter({ value, decimals = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = animate(0, Number(value) || 0, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => { if (ref.current) ref.current.textContent = v.toFixed(decimals); } });
    return () => c.stop();
  }, [value, decimals]);
  return <span ref={ref}>0</span>;
}

/* ---------- Sparkline & ring ---------- */
export function Spark({ data = [], color = 'var(--c, var(--brand))', h = 34, w = 120 }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={color} opacity="0.12" />
      <motion.path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

export function Ring({ value, max = 100, size = 120, stroke = 11, color = 'url(#sunr)', children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <defs><linearGradient id="sunr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--sun-1)" /><stop offset="1" stopColor="var(--sun-2)" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1.3, ease: 'easeOut' }} />
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

/* ---------- Stat tile ---------- */
export function Tile({ label, value, decimals = 0, hint, icon: Icon, color = 'var(--brand)', delay = 0, suffix = '', spark, delta }) {
  return (
    <motion.div className="tile" style={{ '--c': color }} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 180, damping: 20 }}>
      {Icon && <Icon className="ic" size={26} />}
      <div className="k">{label}</div>
      <div className="v"><Counter value={value} decimals={decimals} />{suffix}</div>
      <div className="row between" style={{ marginTop: 3 }}>
        {hint && <div className="h">{hint}</div>}
        {delta != null && <span className={`chip ${delta >= 0 ? 'pass' : 'fail'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}</span>}
      </div>
      {spark && <Spark data={spark} />}
    </motion.div>
  );
}

/* ---------- Drawer ---------- */
export function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="overlay" style={{ zIndex: 94 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label={title} initial={{ x: 520 }} animate={{ x: 0 }} exit={{ x: 520 }} transition={{ type: 'spring', stiffness: 280, damping: 32 }}>
          <div className="row between" style={{ marginBottom: 18 }}><h3 style={{ fontSize: '1.2rem' }}>{title}</h3><button className="btn paper sm icon" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
          {children}
        </motion.aside>
      </>)}
    </AnimatePresence>
  );
}

/* ---------- Custom select (listbox) ---------- */
export function Select({ value, onChange, options, placeholder = 'Select', label, style }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const ref = useRef(null);
  const id = useId();
  const cur = options.find((o) => String(o.value) === String(value));
  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  const pick = (o) => { onChange(o.value); setOpen(false); };
  const onKey = (e) => {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); setHi(Math.max(0, options.findIndex((o) => String(o.value) === String(value)))); return; }
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[hi]) pick(options[hi]); }
  };
  return (
    <div className="sel" ref={ref} style={style}>
      <button type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={label} onClick={() => setOpen(!open)} onKeyDown={onKey}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.label : <span className="muted">{placeholder}</span>}</span>
        <ChevronDown size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul id={id} role="listbox" className="sel-list" initial={{ opacity: 0, y: -8, scaleY: 0.92 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -6 }} style={{ transformOrigin: 'top' }}>
            {options.length === 0 && <li className="sel-opt muted">No options</li>}
            {options.map((o, i) => (
              <li key={o.value} role="option" aria-selected={String(o.value) === String(value)} className={`sel-opt ${i === hi ? 'active' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}>
                <span>{o.label}{o.sub && <small> · {o.sub}</small>}</span>
                {String(o.value) === String(value) && <Check size={16} />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={String(o.value) === String(value)} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tr" />
      <span>{label}</span>
    </label>
  );
}

/* ---------- Modal + confirm ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="card modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: 'min(960px,100%)' } : undefined}
            initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <button className="btn paper sm icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ConfirmCtx = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmCtx);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const done = (v) => { state.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!state} onClose={() => done(false)} title={state?.title || 'Are you sure?'}>
        <p style={{ marginBottom: 18 }}>{state?.message}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn paper" onClick={() => done(false)}>Cancel</button>
          <button className={`btn ${state?.danger ? 'coral' : ''}`} onClick={() => done(true)}>{state?.confirm || 'Confirm'}</button>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/* ---------- Small pieces ---------- */
export const Chip = ({ kind = '', children }) => <span className={`chip ${kind}`}>{children}</span>;
export const Badge = Chip;
export const Skeleton = ({ h = 90 }) => <div className="skeleton" style={{ height: h }} />;
export const Spinner = () => <div className="stack" aria-label="Loading"><Skeleton h={70} /><Skeleton h={160} /><Skeleton h={120} /></div>;
export const Empty = ({ title = 'Nothing here yet', children, action }) => (
  <div className="empty"><Inbox size={34} strokeWidth={1.6} /><b>{title}</b><div>{children}</div>{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>
);
export const Meter = ({ value, max = 100, color }) => <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, '--c': color }} /></div>;

export function PageHeader({ crumb, title, sub, children }) {
  return (
    <motion.div className="page-head" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
      <div>
        {crumb && <div className="crumb">{crumb}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="row">{children}</div>
    </motion.div>
  );
}

export function Field({ label, children, error, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => setState({ data, loading: false, error: null })).catch((e) => setState({ data: null, loading: false, error: e }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10]}`;
export const statusKind = (s) => (s === 'pass' ? 'pass' : s === 'fail' ? 'fail' : 'incomplete');
export const termName = (p, t) => `${p.term_label} ${Number(t) + Number(p.term_offset || 0)}`;
export const termOptions = (p) => Array.from({ length: p?.term_count || 8 }, (_, i) => ({ value: i + 1, label: termName(p, i + 1) }));
export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- Table helpers: sorting + pagination ---------- */
export function useTable(rows, { pageSize = 10, sort: initial = null } = {}) {
  const [sort, setSort] = useState(initial);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    return [...rows].sort((a, b) => {
      const x = a[key], y = b[key];
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
      return dir === 'asc' ? r : -r;
    });
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages);
  useEffect(() => { setPage(1); }, [rows.length]);
  const toggle = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
  return { rows: sorted.slice((cur - 1) * pageSize, cur * pageSize), total: sorted.length, page: cur, pages, setPage, sort, toggle, pageSize };
}

export function SortTh({ t, k, children, num }) {
  const on = t.sort?.key === k;
  return (
    <th className={num ? 'num' : ''} aria-sort={on ? (t.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => t.toggle(k)} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
        {children}<span style={{ opacity: on ? 1 : 0.3, color: on ? 'var(--brand)' : 'inherit' }}>{on && t.sort.dir === 'desc' ? '↓' : '↑'}</span>
      </button>
    </th>
  );
}

export function Pager({ t }) {
  if (t.total <= t.pageSize) return <div className="small muted" style={{ padding: '10px 4px' }}>{t.total} {t.total === 1 ? 'row' : 'rows'}</div>;
  return (
    <div className="row between" style={{ padding: '10px 4px' }}>
      <span className="small muted">{(t.page - 1) * t.pageSize + 1}-{Math.min(t.page * t.pageSize, t.total)} of {t.total}</span>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn paper sm" disabled={t.page <= 1} onClick={() => t.setPage(t.page - 1)}>Previous</button>
        <span className="chip">{t.page} / {t.pages}</span>
        <button className="btn paper sm" disabled={t.page >= t.pages} onClick={() => t.setPage(t.page + 1)}>Next</button>
      </div>
    </div>
  );
}

export const Avatar = ({ name, size = 34 }) => {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  const c = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'][hue];
  return <span style={{ width: size, height: size, borderRadius: 11, display: 'inline-grid', placeItems: 'center', flexShrink: 0, fontWeight: 800, fontFamily: 'var(--font-head)', fontSize: size * 0.4, color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>;
};

export const downloadCsv = (name, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
};

// First usable name, skipping honorifics such as Dr., Mr., Prof.
export const firstName = (n = '') => (n.split(/\s+/).find((w) => w && !/\.$/.test(w)) || n.split(/\s+/)[0] || '');
