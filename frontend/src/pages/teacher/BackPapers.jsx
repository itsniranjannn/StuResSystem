import { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { Chip, Empty, Field, Spinner, Select, useLoad, useToast } from '../../components/ui.jsx';
import { get, put, errMsg } from '../../lib/api';

// Back papers (re-sits): list the students who still have to clear this subject, with every earlier sitting,
// and record the new result. A passing mark clears the subject and recalculates the original semester result.
export default function BackPapers({ subjectId }) {
  const toast = useToast();
  const sheet = useLoad(() => get(`/teacher/subjects/${subjectId}/backpapers`), [subjectId]);
  const [rows, setRows] = useState({});
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (sheet.data) { setYear(String(sheet.data.suggested_year)); setRows({}); } }, [sheet.data]);
  if (sheet.loading) return <Spinner />;
  const { subject, candidates } = sheet.data;
  const set = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  const years = Array.from({ length: 4 }, (_, i) => sheet.data.suggested_year + i);
  const filled = candidates.filter((c) => rows[c.student_id]?.internal !== undefined && rows[c.student_id]?.internal !== '');
  const save = async () => {
    setBusy(true);
    try {
      const entries = filled.map((c) => ({ student_id: c.student_id, label: c.roll_no, internal_marks: rows[c.student_id].internal, external_marks: rows[c.student_id].external ?? '' }));
      const d = await put(`/teacher/subjects/${subjectId}/backpapers`, { year: Number(year), entries });
      toast(`${d.saved} back paper result${d.saved === 1 ? '' : 's'} saved, ${d.results.filter((r) => r.passed).length} cleared. Results recalculated.`);
      sheet.reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="row between">
          <div className="row">
            <Field label="Back paper year"><Select value={year} onChange={setYear} label="Back paper year" options={years.map((y) => ({ value: String(y), label: String(y) }))} style={{ minWidth: 140 }} /></Field>
            <Chip kind="info">Pass mark {subject.pass_percent}%</Chip><Chip>Internal / {subject.internal_full}</Chip>{subject.external_full > 0 && <Chip>External / {subject.external_full}</Chip>}
          </div>
          <button className="btn" onClick={save} disabled={busy || !filled.length}><Save size={15} /> {busy ? 'Saving...' : `Save ${filled.length || ''} back paper result${filled.length === 1 ? '' : 's'}`}</button>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>These students have not yet cleared this subject. A pass replaces the failed attempt and updates their semester GPA and CGPA. The earlier sittings stay in their history.</p>
      </div>
      {candidates.length === 0 ? <div className="card"><Empty title="Nobody owes a back paper in this subject"><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> Every student who sat it has passed.</Empty></div> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Symbol no.</th><th>Student</th><th>Earlier sittings</th><th className="num">Internal</th><th className="num">External</th><th>Result</th></tr></thead>
          <tbody>{candidates.map((c) => {
            const r = rows[c.student_id] || {};
            const full = subject.internal_full + subject.external_full;
            const total = r.internal !== undefined && r.internal !== '' ? Number(r.internal) + (subject.external_full ? Number(r.external || 0) : 0) : null;
            const pct = total != null ? Math.round((total / full) * 1000) / 10 : null;
            return (
              <tr key={c.student_id}>
                <td className="mono">{c.roll_no}</td><td><b>{c.student_name}</b></td>
                <td><div className="row" style={{ gap: 4 }}>{c.history.map((h) => <Chip key={h.exam_year} kind="fail">{h.exam_year}: {h.percent}%</Chip>)}</div></td>
                <td className="num"><input className="input marks-input" type="number" min="0" max={subject.internal_full} step="0.5" value={r.internal ?? ''} onChange={(e) => set(c.student_id, 'internal', e.target.value)} aria-label={`Back paper internal marks for ${c.student_name}`} /></td>
                <td className="num"><input className="input marks-input" type="number" min="0" max={subject.external_full} step="0.5" disabled={!subject.external_full} value={subject.external_full ? r.external ?? '' : ''} placeholder={subject.external_full ? '' : 'n/a'} onChange={(e) => set(c.student_id, 'external', e.target.value)} aria-label={`Back paper external marks for ${c.student_name}`} /></td>
                <td>{pct == null ? <span className="muted small">enter marks</span> : <Chip kind={pct >= subject.pass_percent ? 'pass' : 'fail'}>{pct}% {pct >= subject.pass_percent ? 'clears it' : 'still short'}</Chip>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
    </>
  );
}
