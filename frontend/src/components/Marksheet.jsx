import { motion } from 'framer-motion';
import { Printer, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Chip, statusKind } from './ui.jsx';

// TU-style grade sheet. `sheet` comes from /results/.../marksheet. The QR code and 10-character code let anyone
// confirm authenticity at /verify/<code>, which is how forged marksheets are caught.
export default function Marksheet({ sheet }) {
  const { student, term_name, exam_year, subjects, summary, result, class_size, institution } = sheet;
  const pass = summary.status === 'pass';
  const division = student.grading_scheme === 'division';
  const verifyUrl = result?.verify_code ? `${window.location.origin}/verify/${result.verify_code}` : null;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
      <div className="card marksheet">
        <div className="stamp" style={{ color: pass ? '#1b8a52' : '#d23a2c' }}>{pass ? 'Passed' : 'Reappear'}</div>
        <div className="ms-head">
          {institution?.institution_tagline && <div className="small mono" style={{ letterSpacing: '0.2em' }}>{institution.institution_tagline.toUpperCase()}</div>}
          <h2>{institution?.institution_name || 'Grade sheet'}</h2>
          <div className="muted">Grade sheet · {student.program_name} · {term_name} · Exam year {exam_year}</div>
        </div>
        <div className="kv">
          <div><span>Student</span><b>{student.student_name}</b></div>
          <div><span>Symbol no.</span><b className="mono">{student.roll_no}</b></div>
          <div><span>Registration</span><b className="mono">{student.reg_no || '-'}</b></div>
          <div><span>Class rank</span><b>{result?.class_rank ? `${result.class_rank} of ${class_size}` : '-'}</b></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Subject</th><th className="num">Cr.</th><th className="num">Internal</th><th className="num">External</th><th className="num">Total</th><th className="num">%</th><th>{division ? 'Band' : 'Grade'}</th>{!division && <th className="num">GP</th>}</tr></thead>
            <tbody>
              {subjects.map((s, i) => (
                <motion.tr key={s.code} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                  <td className="mono">{s.code}</td><td>{s.subject_name}</td><td className="num">{s.credit}</td>
                  <td className="num">{s.internal_marks}/{s.internal_full}</td><td className="num">{s.external_full ? `${s.external_marks}/${s.external_full}` : '-'}</td>
                  <td className="num">{s.total}/{s.full}</td><td className="num">{s.percent}</td>
                  <td><Chip kind={s.passed ? 'pass' : 'fail'}>{s.grade}</Chip>{s.cleared_by_backpaper && <span title={s.history.map((h) => `${h.exam_year}: ${h.percent}% ${h.grade}`).join(' → ')}> <Chip kind="info">back paper</Chip></span>}</td>{!division && <td className="num">{s.point.toFixed(1)}</td>}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row between" style={{ marginTop: 20, alignItems: 'flex-end' }}>
          <div className="grid-4" style={{ flex: 1, minWidth: 'min(280px, 100%)', gap: 18 }}>
            <div><div className="lbl">Total</div><div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{summary.total}/{summary.full}</div></div>
            <div><div className="lbl">Percentage</div><div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{summary.percentage}%</div></div>
            <div><div className="lbl">{division ? 'GPA equiv.' : 'GPA'}</div><div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--brand)' }}>{summary.gpa.toFixed(2)}</div></div>
            <div><div className="lbl">Result</div><Chip kind={statusKind(summary.status)}>{summary.status === 'pass' ? (summary.division || summary.grade) : summary.status}</Chip></div>
          </div>
          {verifyUrl && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ border: '2px solid #0e1730', borderRadius: 10, padding: 6, background: '#fff', display: 'inline-block' }}><QRCodeSVG value={verifyUrl} size={84} fgColor="#0e1730" /></div>
              <div className="mono small" style={{ marginTop: 4, letterSpacing: '0.12em' }}>{result.verify_code}</div>
              <div className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><ShieldCheck size={12} /> scan to verify</div>
            </div>
          )}
        </div>
        {sheet.backpapers > 0 && <p className="small" style={{ marginTop: 14 }}><Chip kind="info">back paper</Chip> {sheet.backpapers} subject{sheet.backpapers > 1 ? 's were' : ' was'} cleared in a back paper; the new grade replaces the failed one in the GPA above.</p>}
        <p className="muted small" style={{ marginTop: 16 }}>
          Pass rule: at least {student.pass_percent}% in every subject and in its external part. GPA = Σ(grade point × credit) / Σ credit.
        </p>
      </div>
      <div className="row no-print" style={{ marginTop: 14 }}>
        <button className="btn paper" onClick={() => window.print()}><Printer size={16} /> Print / save as PDF</button>
      </div>
    </motion.div>
  );
}
