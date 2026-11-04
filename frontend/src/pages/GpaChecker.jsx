import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Plus, RotateCcw, Trash2, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { Chip, Meter, PageHeader, Ring, Seg, Spark, useToast } from '../components/ui.jsx';
import { Logo } from '../components/Logo.jsx';
import { ThemeButton } from '../components/Shell.jsx';
import { useAuth } from '../lib/auth.jsx';
import { get, errMsg } from '../lib/api';

// Personal GPA checker with back papers (re-sits). Everything runs in the browser and is saved on this device only.
// Mechanics: SGPA = sum(grade point x credit) / sum(credit); CGPA is the same sum over every semester; a failed
// paper is cleared by a later sitting (back paper) whose grade then replaces the failed one.
// IMPORTANT: the default grade table and pass rules are editable on purpose. Check them against your own TU notices.
const PRESETS = {
  standard: {
    label: 'Standard (40% per paper)',
    passPct: 40, minSgpa: 0,
    bands: [[90, 'A', 4.0], [80, 'A-', 3.7], [75, 'B+', 3.3], [70, 'B', 3.0], [65, 'B-', 2.7], [60, 'C+', 2.3], [55, 'C', 2.0], [50, 'C-', 1.7], [45, 'D+', 1.3], [40, 'D', 1.0]],
  },
  strict: {
    label: 'Strict (B- per paper, SGPA 3.0 to pass the semester)',
    passPct: 50, minSgpa: 3.0,
    bands: [[90, 'A', 4.0], [80, 'A-', 3.7], [70, 'B+', 3.3], [60, 'B', 3.0], [50, 'B-', 2.7]],
  },
};
const KEY = 'anka_gpa_v1';
const uid = () => Math.random().toString(36).slice(2, 8);
const mkSubject = (name = '', credit = 3, marks = ['']) => ({ id: uid(), name, credit, marks });
const sample = () => ({
  preset: 'standard', rules: { ...PRESETS.standard, bands: PRESETS.standard.bands.map((b) => [...b]) },
  semesters: [
    { id: uid(), name: 'Semester 1', subjects: [mkSubject('Computer Fundamentals', 3, ['78']), mkSubject('Society and Technology', 3, ['71']), mkSubject('English I', 3, ['64']), mkSubject('Mathematics I', 3, ['34', '52']), mkSubject('Digital Logic', 3, ['58'])] },
    { id: uid(), name: 'Semester 2', subjects: [mkSubject('C Programming', 3, ['83']), mkSubject('Financial Accounting', 3, ['39']), mkSubject('English II', 3, ['66']), mkSubject('Mathematics II', 3, ['47']), mkSubject('Microprocessor', 3, ['72'])] },
  ],
});

function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v?.semesters?.length) return v; } catch { /* ignore */ } return sample(); }

const bandFor = (pct, bands, passPct) => {
  if (pct < passPct) return { grade: 'F', point: 0 };
  const sorted = [...bands].sort((a, b) => b[0] - a[0]);
  const hit = sorted.find((b) => pct >= b[0]);
  return hit ? { grade: hit[1], point: Number(hit[2]) } : { grade: 'F', point: 0 };
};
const r2 = (n) => Math.round(n * 100) / 100;

// effective attempt: the first sitting that passes, otherwise the most recent sitting
function evalSubject(sub, rules) {
  const attempts = sub.marks.map((m) => (m === '' || m == null || Number.isNaN(Number(m)) ? null : Math.min(100, Math.max(0, Number(m)))));
  const entered = attempts.map((v, i) => ({ v, i })).filter((x) => x.v != null);
  if (!entered.length) return null;
  const firstPass = entered.find((x) => x.v >= rules.passPct);
  const eff = firstPass || entered[entered.length - 1];
  const b = bandFor(eff.v, rules.bands, rules.passPct);
  const first = bandFor(entered[0].v, rules.bands, rules.passPct);
  return { pct: eff.v, attempt: eff.i + 1, grade: b.grade, point: b.point, passed: eff.v >= rules.passPct, firstGrade: first.grade, firstPoint: first.point, cleared: !!firstPass && eff.i > 0, sittings: entered.length, credit: Number(sub.credit) || 0 };
}

function evalSemester(sem, rules) {
  const rows = sem.subjects.map((s) => ({ s, e: evalSubject(s, rules) }));
  const done = rows.filter((r) => r.e);
  const credits = done.reduce((a, r) => a + r.e.credit, 0);
  const pts = done.reduce((a, r) => a + r.e.point * r.e.credit, 0);
  const firstPts = done.reduce((a, r) => a + r.e.firstPoint * r.e.credit, 0);
  const sgpa = credits ? pts / credits : 0;
  const sgpaBefore = credits ? firstPts / credits : 0;
  const failed = done.filter((r) => !r.e.passed).length;
  const complete = done.length === rows.length && rows.length > 0;
  const passed = complete && failed === 0 && sgpa >= rules.minSgpa;
  return { rows, credits, pts, sgpa: r2(sgpa), sgpaBefore: r2(sgpaBefore), failed, complete, passed, cleared: done.filter((r) => r.e.cleared).length, entered: done.length };
}

export default function GpaChecker() {
  const { user } = useAuth();
  const toast = useToast();
  const [st, setSt] = useState(load);
  const [showRules, setShowRules] = useState(false);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } }, [st]);
  const rules = st.rules;
  const sems = useMemo(() => st.semesters.map((s) => ({ s, ev: evalSemester(s, rules) })), [st.semesters, rules]);
  const total = useMemo(() => {
    const credits = sems.reduce((a, x) => a + x.ev.credits, 0); const pts = sems.reduce((a, x) => a + x.ev.pts, 0);
    const before = sems.reduce((a, x) => a + x.ev.sgpaBefore * x.ev.credits, 0);
    return { credits, cgpa: credits ? r2(pts / credits) : 0, cgpaBefore: credits ? r2(before / credits) : 0, pending: sems.reduce((a, x) => a + x.ev.failed, 0), cleared: sems.reduce((a, x) => a + x.ev.cleared, 0), done: sems.filter((x) => x.ev.passed).length };
  }, [sems]);

  const patchSem = (id, fn) => setSt((s) => ({ ...s, semesters: s.semesters.map((x) => (x.id === id ? fn(x) : x)) }));
  const setSubj = (semId, subId, patch) => patchSem(semId, (x) => ({ ...x, subjects: x.subjects.map((y) => (y.id === subId ? { ...y, ...patch } : y)) }));
  const setMark = (semId, sub, i, v) => setSubj(semId, sub.id, { marks: sub.marks.map((m, j) => (j === i ? v : m)) });
  const setPreset = (k) => setSt((s) => ({ ...s, preset: k, rules: { ...PRESETS[k], bands: PRESETS[k].bands.map((b) => [...b]) } }));
  const editRules = (patch) => setSt((s) => ({ ...s, preset: 'custom', rules: { ...s.rules, ...patch } }));

  const importMine = async () => {
    try {
      const t = await get('/results/me/transcript');
      const semesters = t.terms.map((x) => ({ id: uid(), name: x.term_name, subjects: x.subjects.map((s) => mkSubject(s.subject_name, s.credit, (s.history || []).map((h) => String(Math.round(h.percent * 10) / 10)))) }));
      if (!semesters.length) return toast('No published results to import yet', 'error');
      setSt((s) => ({ ...s, semesters }));
      toast(`Imported ${semesters.length} semesters from your results`);
    } catch (e) { toast(errMsg(e), 'error'); }
  };
  const need = (e) => (e ? null : null);
  const trend = sems.filter((x) => x.ev.credits).map((x) => x.ev.sgpa);

  const body = (
    <>
      <div className="bento">
        <div className="span-8 stack">
          {sems.map(({ s, ev }, si) => (
            <motion.div key={s.id} className="card" layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <input className="input" style={{ maxWidth: 220, fontWeight: 700 }} value={s.name} onChange={(e) => patchSem(s.id, (x) => ({ ...x, name: e.target.value }))} aria-label={`Name of semester ${si + 1}`} />
                <div className="row" style={{ gap: 8 }}>
                  {ev.entered > 0 && <Chip kind={ev.passed ? 'pass' : ev.failed ? 'fail' : 'incomplete'}>{ev.passed ? 'Semester passed' : ev.failed ? `${ev.failed} back paper${ev.failed > 1 ? 's' : ''} pending` : ev.complete ? `SGPA below ${rules.minSgpa}` : 'in progress'}</Chip>}
                  <button className="btn ghost sm icon" onClick={() => setSt((x) => ({ ...x, semesters: x.semesters.filter((y) => y.id !== s.id) }))} aria-label={`Remove ${s.name}`}><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Subject</th><th className="num" style={{ width: 70 }}>Credit</th><th>Marks % per sitting</th><th>Counts</th><th /></tr></thead>
                  <tbody>
                    {ev.rows.map(({ s: sub, e }) => (
                      <tr key={sub.id}>
                        <td><input className="input" value={sub.name} placeholder="Subject" onChange={(x) => setSubj(s.id, sub.id, { name: x.target.value })} aria-label="Subject name" /></td>
                        <td className="num"><input className="input mono" type="number" min="0.5" max="9" step="0.5" value={sub.credit} onChange={(x) => setSubj(s.id, sub.id, { credit: x.target.value })} aria-label={`Credits of ${sub.name || 'subject'}`} style={{ width: 70, textAlign: 'right' }} /></td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                            {sub.marks.map((m, i) => (
                              <div key={i} style={{ position: 'relative' }}>
                                <input className="input mono" type="number" min="0" max="100" placeholder={i === 0 ? 'Exam' : `Back ${i}`} value={m} onChange={(x) => setMark(s.id, sub, i, x.target.value)} aria-label={`${i === 0 ? 'Regular exam' : `Back paper ${i}`} marks for ${sub.name || 'subject'}`} style={{ width: 82, textAlign: 'right', borderColor: m !== '' && Number(m) < rules.passPct ? 'var(--bad)' : undefined }} />
                                {i > 0 && <button type="button" onClick={() => setSubj(s.id, sub.id, { marks: sub.marks.filter((_, j) => j !== i) })} aria-label="Remove this sitting" style={{ position: 'absolute', top: -7, right: -7, width: 18, height: 18, borderRadius: 9, border: '1px solid var(--line-strong)', background: 'var(--surface)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}><X size={10} /></button>}
                              </div>
                            ))}
                            {sub.marks.length < 4 && <button type="button" className="btn paper sm" onClick={() => setSubj(s.id, sub.id, { marks: [...sub.marks, ''] })} title="Add a back paper (re-sit) result"><Plus size={13} /> Back paper</button>}
                          </div>
                        </td>
                        <td>
                          {!e ? <span className="muted small">enter marks</span> : e.passed ? (
                            <div className="row" style={{ gap: 6 }}><Chip kind="pass">{e.grade} · {e.point.toFixed(1)}</Chip>{e.cleared && <Chip kind="info">back paper {e.attempt - 1}, was {e.firstGrade}</Chip>}</div>
                          ) : <div className="row" style={{ gap: 6 }}><Chip kind="fail">F</Chip><span className="small muted">needs {rules.passPct}%+ in a back paper</span></div>}
                        </td>
                        <td><button className="btn ghost sm icon" onClick={() => patchSem(s.id, (x) => ({ ...x, subjects: x.subjects.filter((y) => y.id !== sub.id) }))} aria-label={`Remove ${sub.name || 'subject'}`}><X size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <button className="btn paper sm" onClick={() => patchSem(s.id, (x) => ({ ...x, subjects: [...x.subjects, mkSubject('', 3, [''])] }))}><Plus size={14} /> Add subject</button>
                <div className="row" style={{ gap: 14 }}>
                  {ev.cleared > 0 && <span className="small muted">Before back papers <b className="mono">{ev.sgpaBefore.toFixed(2)}</b></span>}
                  <span>SGPA <b className="display" style={{ fontSize: '1.3rem', color: ev.cleared ? 'var(--good)' : undefined }}>{ev.entered ? ev.sgpa.toFixed(2) : '-'}</b></span>
                  <span className="muted small mono">{ev.credits} credits</span>
                </div>
              </div>
            </motion.div>
          ))}
          <div className="row"><button className="btn" onClick={() => setSt((x) => ({ ...x, semesters: [...x.semesters, { id: uid(), name: `Semester ${x.semesters.length + 1}`, subjects: [mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, [''])] }] }))}><Plus size={15} /> Add semester</button>
            {user?.role === 'student' && <button className="btn paper" onClick={importMine}><Download size={15} /> Import my results</button>}
            <button className="btn ghost" onClick={() => { setSt({ ...sample(), semesters: [{ id: uid(), name: 'Semester 1', subjects: [mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, ['']), mkSubject('', 3, [''])] }] }); toast('Cleared. Start entering your marks.'); }}><RotateCcw size={15} /> Clear all</button></div>
        </div>

        <div className="span-4 stack" style={{ position: 'sticky', top: 74, alignSelf: 'start' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Ring value={total.cgpa} max={4} size={150} stroke={11}><div className="display" style={{ fontSize: '2.1rem' }}>{total.cgpa.toFixed(2)}</div><div className="muted small">CGPA</div></Ring>
            {total.cleared > 0 && <div style={{ marginTop: 10 }}><Chip kind="pass">+{r2(total.cgpa - total.cgpaBefore).toFixed(2)} from {total.cleared} back paper{total.cleared > 1 ? 's' : ''}</Chip><div className="muted small" style={{ marginTop: 4 }}>CGPA before back papers: <b className="mono">{total.cgpaBefore.toFixed(2)}</b></div></div>}
            <div className="grid-2" style={{ gap: 10, marginTop: 14, textAlign: 'left' }}>
              <div><div className="lbl">Credits counted</div><b className="mono">{total.credits}</b></div>
              <div><div className="lbl">Semesters passed</div><b className="mono">{total.done}/{sems.length}</b></div>
              <div><div className="lbl">Back papers cleared</div><b className="mono">{total.cleared}</b></div>
              <div><div className="lbl">Back papers pending</div><b className="mono" style={{ color: total.pending ? 'var(--bad)' : 'var(--good)' }}>{total.pending}</b></div>
            </div>
            {trend.length > 1 && <div style={{ marginTop: 14 }}><div className="lbl" style={{ textAlign: 'left' }}>SGPA by semester</div><Spark data={trend} h={46} /></div>}
          </div>
          <div className="card">
            <button className="row between" style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
              <b>Grading rules</b><span className="row small muted" style={{ gap: 4 }}>{st.preset === 'custom' ? 'Custom' : PRESETS[st.preset].label.split(' (')[0]} <ChevronDown size={15} style={{ transform: showRules ? 'rotate(180deg)' : 'none' }} /></span>
            </button>
            <AnimatePresence initial={false}>
              {showRules && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="stack" style={{ marginTop: 12 }}>
                    <Seg value={st.preset} onChange={(v) => v !== 'custom' && setPreset(v)} label="Rule preset" options={[{ value: 'standard', label: 'Standard' }, { value: 'strict', label: 'Strict' }, ...(st.preset === 'custom' ? [{ value: 'custom', label: 'Custom' }] : [])]} />
                    <div className="grid-2" style={{ gap: 10 }}>
                      <div className="field" style={{ margin: 0 }}><label>Pass mark per paper (%)</label><input className="input mono" type="number" min="0" max="100" value={rules.passPct} onChange={(e) => editRules({ passPct: Number(e.target.value) })} /></div>
                      <div className="field" style={{ margin: 0 }}><label>Min SGPA to pass a semester</label><input className="input mono" type="number" min="0" max="4" step="0.1" value={rules.minSgpa} onChange={(e) => editRules({ minSgpa: Number(e.target.value) })} /></div>
                    </div>
                    <div><div className="lbl" style={{ marginBottom: 6 }}>Grade table (marks at least, grade, point)</div>
                      {rules.bands.map((b, i) => (
                        <div key={i} className="row" style={{ gap: 6, marginBottom: 6, flexWrap: 'nowrap' }}>
                          <input className="input mono" type="number" value={b[0]} onChange={(e) => editRules({ bands: rules.bands.map((x, j) => (j === i ? [Number(e.target.value), x[1], x[2]] : x)) })} aria-label={`Minimum marks for band ${i + 1}`} style={{ width: 70 }} />
                          <input className="input" value={b[1]} onChange={(e) => editRules({ bands: rules.bands.map((x, j) => (j === i ? [x[0], e.target.value, x[2]] : x)) })} aria-label={`Grade of band ${i + 1}`} style={{ width: 64 }} />
                          <input className="input mono" type="number" step="0.1" value={b[2]} onChange={(e) => editRules({ bands: rules.bands.map((x, j) => (j === i ? [x[0], x[1], Number(e.target.value)] : x)) })} aria-label={`Grade point of band ${i + 1}`} style={{ width: 70 }} />
                          <button className="btn ghost sm icon" onClick={() => editRules({ bands: rules.bands.filter((_, j) => j !== i) })} aria-label={`Remove band ${i + 1}`}><X size={13} /></button>
                        </div>
                      ))}
                      <button className="btn paper sm" onClick={() => editRules({ bands: [...rules.bands, [0, '', 0]] })}><Plus size={13} /> Add band</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="card flat tint small">
            <div className="row" style={{ gap: 8, alignItems: 'flex-start', flexWrap: 'nowrap' }}><AlertTriangle size={16} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>These are the usual semester mechanics: credit-weighted SGPA and CGPA, a failed paper cleared by a later sitting whose grade replaces it. The grade table and pass rules above are editable because boards revise them. <b>Check them against your own university&apos;s current notices</b> before relying on a result.</span></div>
          </div>
        </div>
      </div>
      <span className="sr">{need()}<CheckCircle2 /><Meter value={0} /></span>
    </>
  );

  if (user) return (<><PageHeader crumb="Tools" title="GPA checker with back papers" sub="Try any exam outcome before it happens. Enter a failed paper, add the back paper result later, and see exactly how your SGPA and CGPA move." />{body}</>);
  return (
    <div style={{ padding: '16px clamp(16px,5vw,64px) 60px', maxWidth: 1260, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 24 }}><Link to="/" style={{ textDecoration: 'none' }}><Logo size={34} /></Link><div className="row"><ThemeButton /><Link to="/login" className="btn paper">Sign in</Link></div></div>
      <div className="crumb">Tools</div>
      <h1 className="display" style={{ fontSize: 'clamp(1.8rem,3.4vw,2.6rem)' }}>GPA checker with back papers</h1>
      <p className="muted" style={{ margin: '8px 0 24px', maxWidth: 640 }}>Try any exam outcome before it happens. Enter a failed paper, add the back paper result later, and see exactly how your SGPA and CGPA move. Nothing leaves your device.</p>
      {body}
    </div>
  );
}
