import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout.jsx';
import { Field, Select, Seg, termOptions, useLoad } from '../components/ui.jsx';
import { useAuth, homeFor } from '../lib/auth.jsx';
import { get, post, errMsg } from '../lib/api';

export default function Register() {
  const { adopt } = useAuth();
  const nav = useNavigate();
  const progs = useLoad(() => get('/auth/programs'), []);
  const [f, setF] = useState({ role: 'student', name: '', email: '', password: '', roll_no: '', reg_no: '', semester: 1, program_id: '', department: '', qualification: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = progs.data?.programs || [];
  const prog = list.find((p) => String(p.id) === String(f.program_id)) || list[0];
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const d = await post('/auth/register', { ...f, program_id: f.program_id || prog?.id });
      if (d.pending) setDone(d.message); else { adopt(d); nav(homeFor(d.user.role)); }
    } catch (er) { setError(errMsg(er)); } finally { setBusy(false); }
  };
  if (done) return <AuthLayout title="Almost there" sub={done}><Link className="btn gold block" to="/login">Back to sign in</Link></AuthLayout>;
  return (
    <AuthLayout title="Create account" sub="Students get instant access. Teachers need admin approval.">
      <Seg value={f.role} onChange={(role) => setF({ ...f, role })} options={[{ value: 'student', label: 'Student' }, { value: 'teacher', label: 'Teacher' }]} label="Account type" />
      <form onSubmit={submit} style={{ marginTop: 16 }}>
        <Field label="Full name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="8+ characters with a letter and a number"><input className="input" type="password" required minLength={8} value={f.password} onChange={set('password')} /></Field>
        {f.role === 'student' ? (
          <>
            <Field label="Program"><Select value={f.program_id || prog?.id} onChange={(v) => setF({ ...f, program_id: v, semester: 1 })} options={list.map((p) => ({ value: p.id, label: p.name, sub: p.code }))} label="Program" /></Field>
            <div className="form-grid">
              <Field label={prog ? prog.term_label : 'Term'}><Select value={f.semester} onChange={(v) => setF({ ...f, semester: v })} options={prog ? termOptions(prog) : []} label="Current term" /></Field>
              <Field label="Symbol number"><input className="input" required value={f.roll_no} onChange={set('roll_no')} /></Field>
            </div>
            <Field label="Registration no. (optional)"><input className="input" value={f.reg_no} onChange={set('reg_no')} /></Field>
          </>
        ) : (
          <div className="form-grid">
            <Field label="Department"><input className="input" value={f.department} onChange={set('department')} /></Field>
            <Field label="Qualification"><input className="input" value={f.qualification} onChange={set('qualification')} /></Field>
          </div>
        )}
        {error && <p className="err" style={{ marginBottom: 12 }} role="alert">{error}</p>}
        <button className="btn gold block" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
      <p className="muted small" style={{ marginTop: 16 }}>Already registered? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}
