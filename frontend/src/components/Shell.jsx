import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck, Trophy, Megaphone, ScrollText, FileText, PenLine, BarChart3, LogOut, Menu, Sun, Moon, KeyRound, Mail, Settings, Layers, CalendarCheck, Activity, Cpu, Calculator, Search, Bell, PanelLeftClose, PanelLeftOpen, ChevronDown, Command, CalendarClock } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { get } from '../lib/api';
import { Logo, LogoMark } from './Logo.jsx';
import CommandPalette from './CommandPalette.jsx';
import { firstName } from './ui.jsx';
import { useInstitution } from '../lib/institution.jsx';

const NAV = {
  admin: [
    ['Overview', [['/admin', 'Dashboard', LayoutDashboard, true], ['/admin/insights', 'Insights', Activity]]],
    ['Academics', [['/admin/programs', 'Programs', Layers], ['/admin/subjects', 'Subjects', BookOpen], ['/admin/students', 'Students', GraduationCap], ['/admin/teachers', 'Teachers', Users], ['/classes', 'Classes', CalendarClock]]],
    ['Results', [['/admin/results', 'Results', ClipboardCheck], ['/ranking', 'Merit list', Trophy]]],
    ['Communication', [['/admin/mail', 'Mail center', Mail], ['/admin/notices', 'Notices', Megaphone]]],
    ['System', [['/admin/settings', 'Institution', Settings], ['/admin/audit', 'Audit log', ScrollText], ['/algorithms', 'Algorithms', Cpu]]],
  ],
  teacher: [
    ['Teaching', [['/teacher', 'My subjects', LayoutDashboard, true], ['/classes', 'Classes', CalendarClock], ['/teacher/marks', 'Marks entry', PenLine], ['/teacher/attendance', 'Attendance', CalendarCheck], ['/teacher/analytics', 'Class insights', BarChart3]]],
    ['More', [['/ranking', 'Merit list', Trophy], ['/algorithms', 'Algorithms', Cpu]]],
  ],
  student: [
    ['My study', [['/student', 'Dashboard', LayoutDashboard, true], ['/classes', 'Classes', CalendarClock], ['/student/results', 'Results', FileText], ['/student/attendance', 'Attendance', CalendarCheck], ['/student/insights', 'Insights', Activity], ['/gpa', 'GPA checker', Calculator]]],
    ['More', [['/ranking', 'Merit list', Trophy], ['/algorithms', 'Algorithms', Cpu]]],
  ],
};

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('anka_theme', next); } catch { /* ignore */ }
  window.dispatchEvent(new Event('themechange'));
}

// Glass panels light up under the cursor: one delegated listener writes the pointer position into CSS variables.
export function useSpotlight() {
  useEffect(() => {
    const on = (e) => {
      const el = e.target.closest?.('.card, .tile');
      if (!el) return;
      const b = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - b.left}px`);
      el.style.setProperty('--my', `${e.clientY - b.top}px`);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);
}

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) fn(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

export function ThemeButton() {
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  useEffect(() => { const h = () => setDark(document.documentElement.dataset.theme === 'dark'); window.addEventListener('themechange', h); return () => window.removeEventListener('themechange', h); }, []);
  return <button className="btn paper icon" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>;
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState([]);
  const [seen, setSeen] = useState(() => Number(localStorage.getItem('anka_seen') || 0));
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  useEffect(() => { get('/results/notices').then((d) => setData(d.notices)).catch(() => {}); }, []);
  const unseen = data.filter((n) => n.id > seen).length;
  const toggle = () => { setOpen(!open); if (!open && data[0]) { localStorage.setItem('anka_seen', data[0].id); setTimeout(() => setSeen(data[0].id), 1500); } };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn paper icon" onClick={toggle} aria-label="Notifications" aria-expanded={open}><Bell size={17} />{unseen > 0 && <span className="dot-badge">{unseen}</span>}</button>
      <AnimatePresence>
        {open && (
          <motion.div className="pop" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            <div className="row between" style={{ padding: '8px 10px' }}><b>Notices</b><span className="chip">{data.length}</span></div>
            {data.length === 0 && <div className="empty small">You are all caught up.</div>}
            {data.slice(0, 6).map((n) => (
              <div key={n.id} className="pop-item"><span className="chip brand" style={{ marginTop: 2 }}>{n.audience}</span><div><div style={{ fontWeight: 700 }}>{n.title}</div><div className="muted small">{n.body.slice(0, 90)}{n.body.length > 90 ? '…' : ''}</div></div></div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="user-chip" onClick={() => setOpen(!open)} aria-expanded={open}><div className="avatar">{user.name[0]}</div><span>{firstName(user.name)}</span><ChevronDown size={15} color="var(--muted)" /></button>
      <AnimatePresence>
        {open && (
          <motion.div className="pop" style={{ width: 250 }} initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
            <div style={{ padding: '10px 10px 12px', borderBottom: '1px solid var(--line)' }}><div style={{ fontWeight: 700 }}>{user.name}</div><div className="muted small">{user.email}</div><span className="chip brand" style={{ marginTop: 6, textTransform: 'capitalize' }}>{user.role}</span></div>
            <NavLink to="/account" className="pop-item" onClick={() => setOpen(false)}><KeyRound size={16} /> Account and password</NavLink>
            <button className="pop-item" style={{ width: '100%', border: 'none', background: 'none', font: 'inherit', cursor: 'pointer', color: 'var(--bad)' }} onClick={() => { logout(); nav('/'); }}><LogOut size={16} /> Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Shell({ children }) {
  const { user } = useAuth();
  const { inst } = useInstitution();
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(() => localStorage.getItem('anka_mini') === '1');
  const [cmd, setCmd] = useState(false);
  const loc = useLocation();
  useSpotlight();
  useEffect(() => { try { localStorage.setItem('anka_mini', mini ? '1' : '0'); } catch { /* ignore */ } }, [mini]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const items = useMemo(() => [
    ...NAV[user.role].flatMap(([group, links]) => links.map(([to, label, icon]) => ({ to, label, icon, group }))),
    { label: 'Switch theme', icon: Sun, group: 'Action', run: toggleTheme, keywords: 'dark light mode' },
    { to: '/account', label: 'Change password', icon: KeyRound, group: 'Action' },
    { to: '/result', label: 'Public result search', icon: Search, group: 'Open' },
    { to: '/verify', label: 'Verify a marksheet', icon: ClipboardCheck, group: 'Open' },
  ], [user.role]);
  const crumb = NAV[user.role].flatMap(([, l]) => l).find(([to, , , end]) => (end ? loc.pathname === to : loc.pathname.startsWith(to)));
  return (
    <div className={`shell ${mini ? 'mini' : ''}`}>
      <aside className={`rail ${open ? 'open' : ''}`}>
        <div className="rail-in">
          <NavLink to={`/${user.role}`} className="brand">{mini ? <LogoMark size={40} animated={false} /> : <Logo size={34} />}</NavLink>
          {!mini && inst.name && <div className="small muted" style={{ padding: '0 10px 6px', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={inst.name}>{inst.name}</div>}
          {NAV[user.role].map(([group, links]) => (
            <div key={group}>
              <div className="rail-group">{group}</div>
              {links.map(([to, label, Icon, end]) => (<NavLink key={to} to={to} end={end} className="nav-link" title={mini ? label : undefined}><Icon size={19} /> <span>{label}</span></NavLink>))}
            </div>
          ))}
          <div className="nav-spacer" />
          <button className="nav-link" onClick={() => setMini(!mini)} aria-label="Collapse sidebar">{mini ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />} <span>Collapse</span></button>
        </div>
      </aside>
      <main className="main">
        <header className="header no-print">
          <button className="btn paper icon menu-btn" onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={18} /></button>
          <button className="cmd-btn" onClick={() => setCmd(true)}><Search size={16} /><span className="t">Search pages and actions</span><span className="kbd"><Command size={10} style={{ verticalAlign: -1 }} /> K</span></button>
          <div className="grow" />
          <ThemeButton /><Notifications /><UserMenu />
        </header>
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {children ?? <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>
      {open && <div className="overlay" style={{ zIndex: 92 }} onClick={() => setOpen(false)} />}
      <CommandPalette open={cmd} onClose={() => setCmd(false)} items={items} />
      <span className="sr">{crumb?.[1]}</span>
    </div>
  );
}
