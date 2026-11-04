import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Database, FileText, Mail, MonitorSmartphone } from 'lucide-react';
import { Chip, Field, PageHeader, Seg, Spinner, useLoad, useToast } from '../../components/ui.jsx';
import { errMsg, get, put } from '../../lib/api';
import { useInstitution } from '../../lib/institution.jsx';

const FIELDS = ['institution_name', 'institution_short', 'institution_tagline', 'institution_address', 'institution_email', 'institution_phone', 'institution_website', 'app_url'];

export default function AdminSettings() {
  const toast = useToast();
  const { refresh } = useInstitution();
  const { data, loading } = useLoad(() => get('/admin/settings'), []);
  const health = useLoad(() => fetch('/api/health').then((r) => r.json()), []);
  const mail = useLoad(() => get('/admin/mail'), []);
  const [f, setF] = useState(null);
  const [saved, setSaved] = useState(null);
  const [view, setView] = useState('marksheet');
  useEffect(() => { if (data) { setF(data.settings); setSaved(data.settings); } }, [data]);
  if (loading || !f) return <Spinner />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dirty = FIELDS.some((k) => f[k] !== saved[k]);
  const save = async (e) => {
    e.preventDefault();
    try { const d = await put('/admin/settings', f); setSaved(d.settings); setF(d.settings); await refresh(); toast('Institution details saved'); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const initials = (f.institution_short || f.institution_name).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <PageHeader crumb="System" title="Branding (optional)" sub="Anka is unbranded by default and works for any school, college or university. If you want your own name on marksheets, transcripts and emails, add it here. Leave everything blank to stay neutral." />
      <div className="bento">
        <form className="card span-6" onSubmit={save}>
          <h3>Identity</h3>
          <Field label="Name (optional)" hint="Appears in the page title, marksheets and emails when set"><input className="input" maxLength={120} value={f.institution_name} onChange={set('institution_name')} /></Field>
          <div className="form-grid">
            <Field label="Short name" hint="Used where space is tight"><input className="input" maxLength={40} value={f.institution_short} onChange={set('institution_short')} /></Field>
            <Field label="Line above the name (optional)" hint="Printed on marksheets, for example a board or university"><input className="input" maxLength={120} value={f.institution_tagline} onChange={set('institution_tagline')} /></Field>
          </div>
          <Field label="Address"><input className="input" maxLength={160} value={f.institution_address} onChange={set('institution_address')} /></Field>
          <div className="form-grid">
            <Field label="Contact email"><input className="input" type="email" value={f.institution_email} onChange={set('institution_email')} /></Field>
            <Field label="Phone"><input className="input" value={f.institution_phone} onChange={set('institution_phone')} /></Field>
          </div>
          <div className="form-grid">
            <Field label="Website"><input className="input" value={f.institution_website} onChange={set('institution_website')} placeholder="https://" /></Field>
            <Field label="Application address" hint="Used in email links and QR codes. Set it when you deploy."><input className="input" value={f.app_url} onChange={set('app_url')} /></Field>
          </div>
          <div className="row between" style={{ marginTop: 6 }}>
            <span className="small muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
            <div className="row"><button type="button" className="btn paper" disabled={!dirty} onClick={() => setF(saved)}>Discard</button><button className="btn" disabled={!dirty}>Save changes</button></div>
          </div>
        </form>

        <div className="span-6 stack">
          <div className="card">
            <div className="row between" style={{ marginBottom: 14 }}><h3 style={{ margin: 0 }}>Live preview</h3>
              <Seg value={view} onChange={setView} label="Preview" options={[{ value: 'marksheet', label: 'Marksheet' }, { value: 'email', label: 'Email' }, { value: 'login', label: 'Sign-in' }]} /></div>
            {view === 'marksheet' && (
              <div style={{ background: '#fff', color: '#0f1a2e', border: '1px solid #c8d0df', borderRadius: 6, padding: '22px 18px', textAlign: 'center' }}>
                <div className="mono small" style={{ letterSpacing: '0.18em', color: '#76829b' }}>{(f.institution_tagline || '').toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', margin: '4px 0' }}>{f.institution_name || 'Grade sheet'}</div>
                <div className="small" style={{ color: '#44506a' }}>{[f.institution_address, f.institution_phone, f.institution_email].filter(Boolean).join(' · ')}</div>
                <div style={{ borderTop: '1px solid #e1e6ef', marginTop: 14, paddingTop: 10, color: '#76829b', fontSize: '0.82rem' }}>Grade sheet · Program · Term · Exam year</div>
              </div>
            )}
            {view === 'email' && (
              <div style={{ border: '1px solid var(--line-strong)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#1f3d78', color: '#fff', padding: '16px 18px' }}><div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{f.institution_name || 'Result notification'}</div>{f.institution_tagline && <div style={{ opacity: 0.8, fontSize: '0.78rem' }}>{f.institution_tagline}</div>}</div>
                <div style={{ padding: 18, background: 'var(--surface)' }}><b>Your Semester 7 result is out</b><p className="muted small" style={{ margin: '6px 0 12px' }}>Hello, the result has been published. GPA 3.82, rank 2 of 14.</p><span className="btn sm">View marksheet</span></div>
              </div>
            )}
            {view === 'login' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--line-strong)', borderRadius: 10, overflow: 'hidden', minHeight: 150 }}>
                <div style={{ background: 'linear-gradient(160deg,#0d1a33,#162c55)', color: '#fff', padding: 16, display: 'grid', alignContent: 'end' }}><div style={{ opacity: 0.7, fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{f.institution_name || ''}</div><div style={{ fontWeight: 650, marginTop: 4 }}>Marks that make sense.</div></div>
                <div style={{ padding: 16, background: 'var(--surface)' }}><b>Sign in</b><div className="input" style={{ height: 30, margin: '10px 0 6px' }} /><div className="input" style={{ height: 30 }} /></div>
              </div>
            )}
            <div className="row" style={{ marginTop: 14, gap: 8 }}><span className="avatar" style={{ borderRadius: 10 }}>{initials}</span><span className="small muted">Short name <b style={{ color: 'var(--ink)' }}>{f.institution_short || f.institution_name}</b> is used in tight spaces.</span></div>
          </div>
          <div className="card">
            <h3>Where these details appear</h3>
            <ul className="steps small">
              {[[FileText, 'Marksheets and transcripts'], [Mail, 'Every email header and footer'], [MonitorSmartphone, 'Public pages, sign-in and the sidebar'], [Building2, 'Browser tab title']].map(([Icon, t]) => <li key={t} className="done"><Icon size={15} /> {t}</li>)}
            </ul>
          </div>
          <div className="card">
            <h3>System status</h3>
            <div className="row" style={{ gap: 8 }}>
              <Chip kind={health.data?.database === 'connected' ? 'pass' : 'fail'}><Database size={13} /> database {health.data?.database || '…'}</Chip>
              <Chip kind={mail.data?.configured ? 'pass' : 'warn'}><Mail size={13} /> email {mail.data?.configured ? 'connected' : 'not set up'}</Chip>
              <Chip kind="info"><CheckCircle2 size={13} /> API online</Chip>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
