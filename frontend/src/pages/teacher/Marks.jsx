import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Lock, Save, Upload } from 'lucide-react';
import { Chip, Empty, Meter, Modal, PageHeader, Select, Seg, Spinner, Switch, termName, useLoad, useToast } from '../../components/ui.jsx';
import BackPapers from './BackPapers.jsx';
import { get, post, put, errMsg } from '../../lib/api';

const blank = (v) => v === '' || v == null;

export default function TeacherMarks() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const subs = useLoad(() => get('/teacher/subjects'), []);
  const subjectId = params.get('subject') || subs.data?.subjects?.[0]?.id;
  const year = params.get('year') || '';
  const mode = params.get('mode') === 'back' ? 'back' : 'regular';
  const sheet = useLoad(() => (subjectId ? get(`/teacher/subjects/${subjectId}/marks`, { year: year || undefined }) : Promise.resolve(null)), [subjectId, year]);
  const [rows, setRows] = useState([]);
  const [orig, setOrig] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [imp, setImp] = useState(null);
  const file = useRef(null);
  const grid = useRef(null);
  const sub = sheet.data?.subject;

  useEffect(() => {
    if (!sheet.data) return;
    const r = sheet.data.roster.map((x) => ({ ...x, internal_marks: x.internal_marks ?? '', external_marks: x.external_marks ?? '' }));
    setRows(r); setOrig(JSON.stringify(r.map((x) => [x.internal_marks, x.external_marks])));
  }, [sheet.data]);
  const dirty = rows.length > 0 && JSON.stringify(rows.map((x) => [x.internal_marks, x.external_marks])) !== orig;
  useEffect(() => { const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  const needExt = sub ? sub.external_full > 0 : true;
  const complete = (r) => !blank(r.internal_marks) && (!needExt || !blank(r.external_marks));
  const badInt = (r) => sub && !blank(r.internal_marks) && (r.internal_marks < 0 || r.internal_marks > sub.internal_full);
  const badExt = (r) => sub && !blank(r.external_marks) && (r.external_marks < 0 || r.external_marks > sub.external_full);
  const invalid = (r) => badInt(r) || badExt(r);
  const filled = rows.filter(complete).length;
  const set = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = useCallback(async () => {
    if (!sub) return;
    if (rows.some(invalid)) return toast('Some marks are out of range', 'error');
    setBusy(true);
    try {
      const d = await put(`/teacher/subjects/${sub.id}/marks`, { year: sheet.data.year, entries: rows.filter((r) => !r.locked).map(({ student_id, internal_marks, external_marks }) => ({ student_id, internal_marks, external_marks })) });
      toast(`Saved ${d.saved} entries${d.skipped_locked ? ` (${d.skipped_locked} locked)` : ''}. Results recalculated.`);
      sheet.reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sub, sheet.data]);
  useEffect(() => { const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty && !busy) save(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [dirty, busy, save]);

  const shown = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => !missing || (!complete(r) && !r.locked)), [rows, missing, sub]); // eslint-disable-line react-hooks/exhaustive-deps
  // Enter moves to the same column on the next row, like a spreadsheet.
  const onKey = (e, i, col) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = grid.current?.querySelector(`[data-cell="${i + 1}-${col}"]`);
    if (next) { next.focus(); next.select?.(); }
  };
  const template = () => {
    const csv = ['symbol,internal,external', ...rows.map((r) => `${r.roll_no},${r.internal_marks},${r.external_marks}`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `marks-${sub.code}-${sheet.data.year}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const runImport = async () => {
    try {
      const d = await post(`/teacher/subjects/${sub.id}/marks/import`, { year: sheet.data.year, csv: imp.csv });
      toast(`Imported ${d.saved} rows${d.skipped.length ? `, ${d.skipped.length} skipped` : ''}`);
      setImp(d.skipped.length ? { ...imp, report: d.skipped } : null); sheet.reload();
    } catch (e) { setImp({ ...imp, report: [e.response?.data?.message || errMsg(e), ...(e.response?.data?.errors || [])] }); }
  };

  if (subs.loading) return <Spinner />;
  if (!subs.data.subjects.length) return <><PageHeader title="Marks entry" /><div className="card"><Empty title="No subjects assigned to you" /></div></>;
  const pct = rows.length ? Math.round((filled / rows.length) * 100) : 0;

  return (
    <>
      <PageHeader crumb="Marks" title="Marks entry" sub={mode === 'back' ? 'Record back paper (re-sit) results for students who have not yet cleared this subject.' : 'Type marks directly or import a CSV. Press Enter to move down a column and Ctrl+S to save. Published marks are locked.'}>
        <Seg value={mode} onChange={(m) => setParams({ subject: subjectId, ...(m === 'back' ? { mode: 'back' } : {}) })} label="Exam type" options={[{ value: 'regular', label: 'Regular exam' }, { value: 'back', label: 'Back papers' }]} />
        {mode === 'regular' && <button className="btn paper" onClick={template} disabled={!sub}><Download size={15} /> CSV template</button>}
        {mode === 'regular' && <button className="btn paper" onClick={() => setImp({ csv: '' })} disabled={!sub}><Upload size={15} /> Import CSV</button>}
        {mode === 'regular' && <button className="btn" onClick={save} disabled={busy || !dirty}><Save size={15} /> {busy ? 'Saving...' : 'Save marks'}</button>}
      </PageHeader>
      {mode === 'back' && (
        <>
          <div className="card" style={{ marginBottom: 16, padding: 16 }}><Select value={subjectId} onChange={(v) => setParams({ subject: v, mode: 'back' })} style={{ minWidth: 'min(340px, 100%)' }} label="Subject" options={subs.data.subjects.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}`, sub: `${x.program} ${termName(x, x.semester)}` }))} /></div>
          <BackPapers key={subjectId} subjectId={subjectId} />
        </>
      )}
      {mode === 'regular' && <>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="row between">
          <div className="row">
            <Select value={subjectId} onChange={(v) => setParams({ subject: v })} style={{ minWidth: 'min(340px, 100%)' }} label="Subject" options={subs.data.subjects.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}`, sub: `${s.program} ${termName(s, s.semester)}` }))} />
            {sheet.data && <Select value={sheet.data.year} onChange={(v) => setParams({ subject: subjectId, year: v })} label="Exam year" options={sheet.data.years.map((y) => ({ value: y.year, label: `Exam ${y.year}`, sub: `batch ${y.batch}` }))} />}
          </div>
          <div className="row">{sub && <Chip kind="info">Internal / {sub.internal_full}</Chip>}{sub && sub.external_full > 0 && <Chip kind="info">External / {sub.external_full}</Chip>}{dirty ? <Chip kind="warn">unsaved changes</Chip> : rows.length > 0 && <Chip kind="pass">saved</Chip>}</div>
        </div>
        {rows.length > 0 && (
          <div className="row between" style={{ marginTop: 14, gap: 20 }}>
            <div style={{ flex: 1, minWidth: 220 }}><div className="row between small" style={{ marginBottom: 4 }}><span>{filled} of {rows.length} students entered</span><b className="mono">{pct}%</b></div><Meter value={pct} color={pct === 100 ? 'var(--good)' : 'var(--s1)'} /></div>
            <Switch checked={missing} onChange={setMissing} label="Show only missing" />
          </div>
        )}
      </div>

      {sheet.loading ? <Spinner /> : rows.length === 0 ? <div className="card"><Empty title="No students in this cohort" /></div> : (
        <div className="table-wrap" ref={grid}>
          <table>
            <thead><tr><th>Symbol no.</th><th>Student</th><th className="num">Internal</th><th className="num">External</th><th className="num">Total</th><th className="num">%</th><th /></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={7}><Empty title="Nothing missing">Every student has marks.</Empty></td></tr>}
              {shown.map(({ r, i }) => {
                const full = sub.internal_full + sub.external_full;
                const total = complete(r) ? Number(r.internal_marks) + (needExt ? Number(r.external_marks) : 0) : null;
                const p = total != null ? Math.round((total / full) * 1000) / 10 : null;
                return (
                  <tr key={r.student_id}>
                    <td className="mono">{r.roll_no}</td><td>{r.student_name}</td>
                    <td className="num"><input data-cell={`${i}-0`} className={`input marks-input ${badInt(r) ? 'bad' : ''}`} type="number" step="0.5" min="0" max={sub.internal_full} disabled={!!r.locked} value={r.internal_marks} onChange={(e) => set(i, 'internal_marks', e.target.value)} onKeyDown={(e) => onKey(e, i, 0)} aria-label={`Internal marks for ${r.student_name}`} /></td>
                    <td className="num"><input data-cell={`${i}-1`} className={`input marks-input ${badExt(r) ? 'bad' : ''}`} type="number" step="0.5" min="0" max={sub.external_full} disabled={!!r.locked || !needExt} value={needExt ? r.external_marks : ''} placeholder={needExt ? '' : 'n/a'} onChange={(e) => set(i, 'external_marks', e.target.value)} onKeyDown={(e) => onKey(e, i, 1)} aria-label={`External marks for ${r.student_name}`} /></td>
                    <td className="num">{total ?? '-'}</td>
                    <td className="num" style={{ color: p != null && p < 40 ? 'var(--bad)' : 'inherit' }}>{p ?? '-'}</td>
                    <td>{r.locked ? <span title="Published: locked" style={{ color: 'var(--muted)' }}><Lock size={15} /></span> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </>}
      <Modal open={!!imp} onClose={() => setImp(null)} title="Import marks from CSV">
        {imp && (<>
          <p className="muted small" style={{ marginBottom: 10 }}>Columns: <span className="mono">symbol, internal, external</span>. A header row is optional, and commas or tabs both work, so you can paste straight from Excel.</p>
          <div className="row" style={{ marginBottom: 10 }}>
            <input ref={file} type="file" accept=".csv,.txt,text/csv" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) setImp({ csv: await f.text() }); }} />
            <button className="btn paper sm" onClick={() => file.current.click()}>Choose file</button>
          </div>
          <textarea className="input mono" rows={9} placeholder={'symbol,internal,external\n27802063,34,52'} value={imp.csv} onChange={(e) => setImp({ csv: e.target.value })} aria-label="CSV data" />
          {imp.report && <ul className="stack small err" style={{ marginTop: 10, listStyle: 'none' }}>{imp.report.slice(0, 8).map((x) => <li key={x}>{x}</li>)}</ul>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn paper" onClick={() => setImp(null)}>Close</button><button className="btn" disabled={!imp.csv.trim()} onClick={runImport}>Import</button></div>
        </>)}
      </Modal>
    </>
  );
}
