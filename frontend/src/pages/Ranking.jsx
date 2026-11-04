import { useState } from 'react';
import { motion } from 'framer-motion';
import { PodiumScene } from '../components/Scenes.jsx';
import BatchPicker, { parseBatch } from '../components/BatchPicker.jsx';
import { Chip, Empty, PageHeader, Spinner, statusKind, useLoad } from '../components/ui.jsx';
import { get } from '../lib/api';
import { useI18n } from '../lib/i18n.jsx';

export default function Ranking() {
  const { t } = useI18n();
  const avail = useLoad(() => get('/results/available'), []);
  const [sel, setSel] = useState('');
  const b = parseBatch(sel);
  const rank = useLoad(() => (b ? get('/results/ranking', { program_id: b.program_id, semester: b.semester, exam_year: b.exam_year }) : Promise.resolve(null)), [sel]);
  const rows = rank.data?.ranking || [];
  const top = rows.filter((r) => r.class_rank && r.class_rank <= 3).slice(0, 3);
  return (
    <>
      <PageHeader crumb="Merit list" title={t('ranking.title', 'Class ranking')} sub="Ranked by GPA, then total marks. Equal scores share a rank.">
        <BatchPicker batches={avail.data?.batches} value={sel} onChange={setSel} />
      </PageHeader>
      {(avail.loading || rank.loading) && <Spinner />}
      {!rank.loading && rows.length === 0 && <div className="card"><Empty title="No ranked results yet">Results appear here once the administration publishes them.</Empty></div>}
      {top.length >= 3 && <div className="card" style={{ marginBottom: 22, padding: 10 }}><PodiumScene top={top} /></div>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rank</th><th>Symbol no.</th><th>Name</th><th className="num">Total</th><th className="num">%</th><th className="num">GPA</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.student_id} className={r.student_id === rank.data.me ? 'me-row' : ''} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 20) * 0.02 }}>
                  <td>{r.class_rank <= 3 ? <span className={`medal r${r.class_rank}`}>{r.class_rank}</span> : <span className="mono">{r.class_rank}</span>}</td>
                  <td className="mono">{r.roll_no}</td>
                  <td>{r.student_name}{r.student_id === rank.data.me && <b className="muted"> (you)</b>} {!r.published && <Chip kind="warn">draft</Chip>}</td>
                  <td className="num">{r.total_marks}</td><td className="num">{r.percentage}</td><td className="num">{Number(r.gpa).toFixed(2)}</td>
                  <td><Chip kind={statusKind(r.status)}>{r.status === 'pass' ? (r.division || r.grade) : 'reappear'}</Chip></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
