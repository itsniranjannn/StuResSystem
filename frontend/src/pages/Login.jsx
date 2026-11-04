import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout.jsx';
import { Field } from '../components/ui.jsx';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { useI18n } from '../lib/i18n.jsx';
import { errMsg } from '../lib/api';

const DEMO = [['Admin', 'admin@anka.test', 'Admin@123'], ['Teacher', 'teacher1@anka.test', 'Teacher@123'], ['Student', 'student@anka.test', 'Student@123']];

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const u = await login(f.email, f.password); nav(homeFor(u.role)); } catch (er) { setError(errMsg(er)); } finally { setBusy(false); }
  };
  return (
    <AuthLayout title={t('login.title', 'Welcome back')} sub="Sign in to your Anka portal.">
      <form onSubmit={submit}>
        <Field label={t('login.email', 'Email')}><input className="input" type="email" required autoFocus autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label={t('login.password', 'Password')}>
          <div style={{ position: 'relative' }}>
            <input className="input" type={show ? 'text' : 'password'} required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} style={{ paddingRight: 44 }} />
            <button type="button" className="btn paper sm icon" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 6, top: 6, boxShadow: 'none' }}>{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </Field>
        {error && <motion.p className="err" animate={{ x: [0, -7, 7, -4, 0] }} style={{ marginBottom: 12 }} role="alert">{error}</motion.p>}
        <button className="btn gold block" disabled={busy}><LogIn size={18} /> {busy ? 'Signing in...' : t('hero.signin', 'Sign in')}</button>
      </form>
      <div className="row between small" style={{ marginTop: 16 }}><Link to="/forgot">{t('login.forgot', 'Forgot password?')}</Link><Link to="/register">{t('login.create', 'Create account')}</Link></div>
      <hr className="divider" />
      <div className="lbl" style={{ marginBottom: 8 }}>Demo accounts: click to fill</div>
      <div className="row">{DEMO.map(([r, em, pw]) => <button key={r} type="button" className="btn paper sm" onClick={() => setF({ email: em, password: pw })}>{r}</button>)}</div>
    </AuthLayout>
  );
}
