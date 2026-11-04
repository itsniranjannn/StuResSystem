import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from './AuthLayout.jsx';
import { Field, useToast } from '../components/ui.jsx';
import { post, errMsg } from '../lib/api';

export default function Reset() {
  const { token } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return setError('Passwords do not match');
    try { await post('/auth/reset-password', { token, password: pw }); toast('Password updated. Please sign in.'); nav('/login'); } catch (er) { setError(errMsg(er)); }
  };
  return (
    <AuthLayout title="Choose a new password" sub="Use 8+ characters with a letter and a number.">
      <form onSubmit={submit}>
        <Field label="New password"><input className="input" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Confirm password"><input className="input" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        {error && <p className="err" style={{ marginBottom: 10 }} role="alert">{error}</p>}
        <button className="btn gold block">Update password</button>
        <p style={{ marginTop: 14 }} className="small"><Link to="/login">Back to sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
