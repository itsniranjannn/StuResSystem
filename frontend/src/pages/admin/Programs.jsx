import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Chip, Field, Modal, PageHeader, Select, Spinner, useConfirm, useLoad, useToast } from '../../components/ui.jsx';
import { del, errMsg, get, post, put } from '../../lib/api';

const SCHEMES = [
  { value: 'tu_gpa', label: 'Semester GPA (4.0 scale)', sub: 'A to D' },
  { value: 'neb_gpa', label: 'Grade points', sub: 'A+ to D, NG' },
  { value: 'division', label: 'Percentage divisions', sub: 'Distinction, First, Second' },
];
const BANDS = {
  tu_gpa: [['A', 90], ['A-', 80], ['B+', 75], ['B', 70], ['B-', 65], ['C+', 60], ['C', 55], ['C-', 50], ['D+', 45], ['D', 40]],
  neb_gpa: [['A+', 90], ['A', 80], ['B+', 70], ['B', 60], ['C+', 50], ['C', 40], ['D', 35]],
  division: [['Distinction', 80], ['First', 60], ['Second', 48], ['Pass', 40]],
};
const LEVELS = [{ value: 'school', label: 'School' }, { value: 'higher_secondary', label: 'Higher secondary' }, { value: 'bachelor', label: 'Bachelor' }, { value: 'master', label: 'Master' }];
const PRESETS = [
  { label: 'Semester bachelor', v: { level: 'bachelor', grading_scheme: 'tu_gpa', term_label: 'Semester', term_count: 8, term_offset: 0, terms_per_year: 2, pass_percent: 40 } },
  { label: 'Yearly bachelor', v: { level: 'bachelor', grading_scheme: 'division', term_label: 'Year', term_count: 4, term_offset: 0, terms_per_year: 1, pass_percent: 40 } },
  { label: 'Higher secondary', v: { level: 'higher_secondary', grading_scheme: 'neb_gpa', term_label: 'Grade', term_count: 2, term_offset: 10, terms_per_year: 1, pass_percent: 35 } },
  { label: 'School 1-10', v: { level: 'school', grading_scheme: 'division', term_label: 'Class', term_count: 10, term_offset: 0, terms_per_year: 1, pass_percent: 40 } },
];
const blank = { code: '', name: '', level: 'bachelor', grading_scheme: 'tu_gpa', term_label: 'Semester', term_count: 8, term_offset: 0, terms_per_year: 2, pass_percent: 40, attendance_required: 80 };

function Bands({ scheme, pass }) {
  const bands = BANDS[scheme].filter((b) => b[1] >= pass);
  return (
    <div>
      <div style={{ display: 'flex', height: 26, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
        <div style={{ flex: pass, background: 'var(--bad-soft)', color: 'var(--bad)', display: 'grid', placeItems: 'center', fontSize: '0.68rem', fontWeight: 700 }}>fail</div>
        {[...bands].reverse().map((b, i, arr) => { const next = arr[i + 1]?.[1] ?? 100; return <div key={b[0]} title={`${b[0]}: ${b[1]}% and above`} style={{ flex: next - b[1], background: `color-mix(in srgb, var(--s1) ${22 + i * (60 / arr.length)}%, var(--surface))`, display: 'grid', placeItems: 'center', fontSize: '0.66rem', fontWeight: 700, color: 'var(--ink)', borderLeft: '1px solid var(--surface)' }}>{b[0]}</div>; })}
      </div>
      <div className="row between mono small muted" style={{ marginTop: 4 }}><span>0%</span><span>pass {pass}%</span><span>100%</span></div>
    </div>
  );
}

export default function AdminPrograms() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useLoad(() => get('/admin/programs'), []);
  const [form, setForm] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const num = (k) => (e) => setForm({ ...form, [k]: Number(e.target.value) });
  const save = async (e) => {
    e.preventDefault();
    try { const d = form.id ? await put(`/admin/programs/${form.id}`, form) : await post('/admin/programs', form); toast(d.note || 'Program saved'); setForm(null); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  const remove = async (p) => {
    if (!(await confirm({ title: `Delete ${p.code}?`, message: 'Only programs with no students or subjects can be deleted.', danger: true, confirm: 'Delete' }))) return;
    try { await del(`/admin/programs/${p.id}`); toast('Program deleted'); reload(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  return (
    <>
      <PageHeader crumb="Academics" title="Programs" sub="A program is any course of study: a school class range, higher secondary, a bachelor or a master. Choose how its terms are named and how it is graded.">
        <button className="btn" onClick={() => setForm({ ...blank })}><Plus size={15} /> New program</button>
      </PageHeader>
      {loading ? <Spinner /> : (
        <div className="grid-3">
          {data.programs.map((p, i) => (
            <motion.div key={p.id} className="card lift" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="row between"><Chip kind="info">{p.code}</Chip><span className="muted small">{LEVELS.find((l) => l.value === p.level)?.label}</span></div>
              <h3 style={{ margin: '12px 0 4px', fontSize: '1.15rem' }}>{p.name}</h3>
              <div className="muted small" style={{ marginBottom: 14 }}>{SCHEMES.find((s) => s.value === p.grading_scheme)?.label}</div>
              <div className="lbl" style={{ marginBottom: 6 }}>{p.term_count} {p.term_label.toLowerCase()}{p.term_count > 1 ? 's' : ''}</div>
              <div className="row" style={{ gap: 4, marginBottom: 14 }}>{Array.from({ length: p.term_count }, (_, k) => <span key={k} className="mono small" style={{ minWidth: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface-2)' }}>{k + 1 + p.term_offset}</span>)}</div>
              <Bands scheme={p.grading_scheme} pass={p.pass_percent} />
              <div className="row between small" style={{ margin: '14px 0' }}><span><b>{p.students}</b> students</span><span><b>{p.subjects}</b> subjects</span><span>attendance <b>{p.attendance_required}%</b></span></div>
              <div className="row"><button className="btn paper sm" onClick={() => setForm({ ...p })}><Pencil size={14} /> Edit</button><button className="btn ghost sm icon" style={{ color: 'var(--bad)' }} onClick={() => remove(p)} aria-label={`Delete ${p.code}`}><Trash2 size={15} /></button></div>
            </motion.div>
          ))}
        </div>
      )}
      <Modal wide open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit program' : 'New program'}>
        {form && (
          <form onSubmit={save}>
            {!form.id && <div className="row" style={{ marginBottom: 14 }}><span className="lbl">Start from</span>{PRESETS.map((p) => <button key={p.label} type="button" className="btn paper sm" onClick={() => setForm({ ...form, ...p.v })}>{p.label}</button>)}</div>}
            <div className="bento">
              <div className="span-7">
                <div className="form-grid">
                  <Field label="Code"><input className="input" required value={form.code} onChange={set('code')} placeholder="e.g. BCA, SEC, CLASS8" /></Field>
                  <Field label="Name"><input className="input" required value={form.name} onChange={set('name')} /></Field>
                  <Field label="Level"><Select value={form.level} onChange={(v) => setForm({ ...form, level: v })} options={LEVELS} label="Level" /></Field>
                  <Field label="Grading rule" hint="Applies after you recalculate results"><Select value={form.grading_scheme} onChange={(v) => setForm({ ...form, grading_scheme: v })} options={SCHEMES} label="Grading rule" /></Field>
                  <Field label="Term name" hint="Semester, Year, Grade, Class"><input className="input" required value={form.term_label} onChange={set('term_label')} /></Field>
                  <Field label="Number of terms"><input className="input" type="number" min="1" max="12" required value={form.term_count} onChange={num('term_count')} /></Field>
                  <Field label="Terms per year" hint="2 for semesters, 1 for yearly"><input className="input" type="number" min="1" max="4" required value={form.terms_per_year} onChange={num('terms_per_year')} /></Field>
                  <Field label="Number offset" hint="Grade 11 is term 1 with offset 10"><input className="input" type="number" min="0" max="12" value={form.term_offset} onChange={num('term_offset')} /></Field>
                  <Field label="Pass percentage"><input className="input" type="number" min="20" max="60" required value={form.pass_percent} onChange={num('pass_percent')} /></Field>
                  <Field label="Attendance required (%)"><input className="input" type="number" min="0" max="100" value={form.attendance_required} onChange={num('attendance_required')} /></Field>
                </div>
              </div>
              <div className="span-5"><div className="card flat tint">
                <div className="lbl" style={{ marginBottom: 10 }}>Preview</div>
                <b>{form.name || 'Program name'}</b>
                <div className="row" style={{ gap: 4, margin: '10px 0' }}>{Array.from({ length: Math.min(12, form.term_count || 1) }, (_, k) => <span key={k} className="mono small" style={{ minWidth: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'var(--surface)' }}>{k + 1 + (form.term_offset || 0)}</span>)}</div>
                <div className="small muted" style={{ marginBottom: 12 }}>{form.term_count} {(form.term_label || 'term').toLowerCase()}{form.term_count > 1 ? 's' : ''}, {form.terms_per_year} per year</div>
                <Bands scheme={form.grading_scheme} pass={Number(form.pass_percent) || 40} />
              </div></div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}><button type="button" className="btn paper" onClick={() => setForm(null)}>Cancel</button><button className="btn">Save program</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
