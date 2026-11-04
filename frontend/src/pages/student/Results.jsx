import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import Marksheet from '../../components/Marksheet.jsx';
import { Chip, Empty, PageHeader, Seg, Spinner, statusKind, useLoad } from '../../components/ui.jsx';
import { get } from '../../lib/api';

function Transcript({ data }) {
  const division = data.student.grading_scheme === 'division';
  return (
    <div className="card marksheet">
      <div className="ms-head">
        {data.institution.institution_tagline && <div className="small mono" style={{ letterSpacing: '0.2em' }}>{data.institution.institution_tagline.toUpperCase()}</div>}
        <h2>{data.institution.institution_name || 'Cumulative transcript'}</h2><div className="muted">Cumulative transcript · {data.student.program_name}</div>
      </div>
      <div className="kv">
        <div><span>Student</span><b>{data.student.student_name}</b></div><div><span>Symbol no.</span><b className="mono">{data.student.roll_no}</b></div>
        <div><span>CGPA</span><b style={{ fontSize: '1.4rem', color: 'var(--brand)' }}>{data.cgpa.toFixed(2)}</b></div><div><span>Overall percentage</span><b>{data.overall_percentage}%</b></div>
        <div><span>Final division</span><b>{data.final_division || (data.completed ? '-' : 'Not completed')}</b></div>
        <div><span>Back papers cleared</span><b>{data.backpapers_cleared || 0}</b></div>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Term</th><th>Year</th><th className="num">Credits</th><th className="num">%</th><th className="num">GPA</th><th>{division ? 'Division' : 'Grade'}</th><th>Result</th><th className="num">Rank</th></tr></thead>
        <tbody>{data.terms.map((t) => (<tr key={t.id}><td>{t.term_name}</td><td className="mono">{t.exam_year}</td><td className="num">{t.total_credits}</td><td className="num">{t.percentage}</td><td className="num">{Number(t.gpa).toFixed(2)}</td><td>{division ? t.division || '-' : t.grade}</td><td><Chip kind={statusKind(t.status)}>{t.status}</Chip></td><td className="num">{t.class_rank}</td></tr>))}</tbody>
      </table></div>
      {data.backlogs.length > 0 && (
        <div style={{ marginTop: 18 }}><h3 style={{ color: 'var(--bad)' }}>Backlogs to clear ({data.backlogs.length})</h3>
          <ul className="stack small" style={{ listStyle: 'none' }}>{data.backlogs.map((b) => <li key={b.code}><Chip kind="fail">{b.code}</Chip> {b.subject_name} <span className="muted">· {b.term_name}, {b.exam_year} ({b.percent}%)</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function StudentResults() {
  const [params, setParams] = useSearchParams();
  const ov = useLoad(() => get('/results/me/overview'), []);
  const tr = useLoad(() => get('/results/me/transcript'), []);
  const results = ov.data?.results || [];
  const view = params.get('view') === 'transcript' ? 'transcript' : 'sheet';
  const sem = Number(params.get('sem')) || null;
  const current = results.find((r) => r.semester === sem) || results[results.length - 1];
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    setSheet(null);
    if (current && view === 'sheet') get(`/results/me/marksheet/${current.semester}/${current.exam_year}`).then(setSheet).catch(() => setSheet(null));
  }, [current?.semester, current?.exam_year, view]); // eslint-disable-line react-hooks/exhaustive-deps
  if (ov.loading) return <Spinner />;
  const st = ov.data.student;
  return (
    <>
      <PageHeader crumb="Results" title="My results" sub="Published grade sheets and your cumulative transcript. Print any of them as PDF.">
        <Seg value={view} onChange={(v) => setParams(v === 'transcript' ? { view: v } : {})} options={[{ value: 'sheet', label: 'Marksheets' }, { value: 'transcript', label: 'Transcript' }]} label="View" />
      </PageHeader>
      {results.length === 0 ? <div className="card"><Empty title="Nothing published yet">Check back after the examination board publishes your term.</Empty></div> : view === 'transcript' ? (
        tr.loading ? <Spinner /> : <><Transcript data={tr.data} /><button className="btn paper no-print" style={{ marginTop: 14 }} onClick={() => window.print()}><Printer size={16} /> Print / save as PDF</button></>
      ) : (
        <>
          <div className="seg no-print" style={{ marginBottom: 18 }}>
            {results.map((r) => <button key={r.id} aria-pressed={current.semester === r.semester} onClick={() => setParams({ sem: r.semester })}>{st.term_label} {r.semester + st.term_offset}</button>)}
          </div>
          {sheet ? <Marksheet sheet={sheet} /> : <Spinner />}
        </>
      )}
    </>
  );
}
