import { useEffect, useMemo } from 'react';
import { Select } from './ui.jsx';

// Picks one (program, term, exam year) batch from a list that looks like
// [{program_id, program, term_label, term_offset, semester, exam_year}].  Value is "programId|term|year".
export const batchLabel = (b) => `${b.program} · ${b.term_label} ${Number(b.semester) + Number(b.term_offset)} · ${b.exam_year}`;
export const batchKey = (b) => `${b.program_id}|${b.semester}|${b.exam_year}`;
export const parseBatch = (v) => { const [program_id, semester, exam_year] = String(v || '').split('|'); return v ? { program_id, semester, exam_year } : null; };

export default function BatchPicker({ batches, value, onChange, style }) {
  const options = useMemo(() => (batches || []).map((b) => ({ value: batchKey(b), label: batchLabel(b) })), [batches]);
  useEffect(() => { if (!value && options.length) onChange(options[0].value); }, [value, options, onChange]);
  return <Select value={value} onChange={onChange} options={options} placeholder="Choose term" label="Program, term and year" style={{ minWidth: 'min(260px, 100%)', ...style }} />;
}
