import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout.jsx';
import { Field } from '../components/ui.jsx';
import { post, errMsg } from '../lib/api';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { setRes(await post('/auth/forgot-password', { email })); } catch (er) { setError(errMsg(er)); }
  };
  return (
    <AuthLayout title="Reset password" sub="We email a link that works once and expires in 30 minutes.">
      {res ? (
        <div>
          <p>{res.message}</p>
          {res.dev_reset_link && (
            <p className="muted small" style={{ marginTop: 12 }}>
              Email is not configured on this server yet (development mode), so here is your link: <a href={res.dev_reset_link.replace(/^https?:\/\/[^/]+/, '')}>open reset page</a>
            </p>
          )}
          <Link to="/login" className="btn paper block" style={{ marginTop: 18 }}>Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <Field label="Email"><input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {error && <p className="err">{error}</p>}
          <button className="btn gold block">Send reset link</button>
          <p style={{ marginTop: 14 }} className="small"><Link to="/login">Back to sign in</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
