import { useState } from 'react';
import { PageHeader, Field, useToast } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { put, errMsg } from '../lib/api';

export default function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ current_password: '', new_password: '' });
  const submit = async (e) => {
    e.preventDefault();
    try { await put('/auth/password', f); toast('Password changed'); setF({ current_password: '', new_password: '' }); } catch (er) { toast(errMsg(er), 'error'); }
  };
  return (
    <>
      <PageHeader crumb="Account" title="Your account" sub="Profile details and password." />
      <div className="grid-2">
        <div className="card"><div className="ribbon" />
          <h3 style={{ marginTop: 8 }}>Profile</h3>
          <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
            <div><span>Name</span><b>{user.name}</b></div><div><span>Email</span><b>{user.email}</b></div>
            <div><span>Role</span><b style={{ textTransform: 'capitalize' }}>{user.role}</b></div>
            {user.program_name && <div><span>Program</span><b>{user.program_name}</b></div>}
            {user.roll_no && <div><span>Symbol number</span><b className="mono">{user.roll_no}</b></div>}
            {user.semester && <div><span>{user.term_label}</span><b>{user.semester + (user.term_offset || 0)}</b></div>}
          </div>
        </div>
        <form className="card" onSubmit={submit}><div className="ribbon" />
          <h3 style={{ marginTop: 8 }}>Change password</h3>
          <Field label="Current password"><input className="input" type="password" required autoComplete="current-password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} /></Field>
          <Field label="New password" hint="8+ characters with a letter and a number"><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} /></Field>
          <button className="btn gold">Update password</button>
        </form>
      </div>
    </>
  );
}
