// Branded HTML emails (inline styles only: email clients ignore stylesheets). Palette matches the web app.
const C = { paper: '#F4F6FA', ink: '#0F1A2E', teal: '#1F3D78', gold: '#B7791F', coral: '#C24260', soft: '#FFFFFF' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout({ inst, title, body, cta }) {
  return `<!doctype html><html><body style="margin:0;background:${C.paper};font-family:Segoe UI,Arial,sans-serif;color:${C.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${C.soft};border:1px solid #d5dbe8;border-radius:12px">
<tr><td style="padding:20px 26px;background:${C.teal};border-radius:11px 11px 0 0;color:#fff">
<div style="font-size:19px;font-weight:700;letter-spacing:-.01em">${esc(inst.institution_name || 'Result notification')}</div>
${inst.institution_tagline ? `<div style="font-size:12px;opacity:.8;margin-top:4px">${esc(inst.institution_tagline)}</div>` : ''}</td></tr>
<tr><td style="padding:26px"><h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(title)}</h1>${body}
${cta ? `<p style="margin:24px 0 4px"><a href="${esc(cta.url)}" style="background:${C.teal};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;display:inline-block">${esc(cta.label)}</a></p>` : ''}</td></tr>
<tr><td style="padding:14px 26px;border-top:1px solid #e3e8f1;font-size:12px;line-height:1.5;color:#5b6a85">${[inst.institution_name, inst.institution_address].filter(Boolean).map(esc).join(' · ')}${inst.institution_name || inst.institution_address ? '<br>' : ''}Sent through Anka result system. You received this because you have an account. Do not share this email if it contains a private link.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${t}</p>`;
const kv = (rows) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;width:100%;border:1px solid #d5dbe8;border-radius:10px">${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:12px;color:#5b6a85;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e3e8f1">${esc(k)}</td><td style="padding:8px 12px;font-weight:700;border-bottom:1px solid #e3e8f1;text-align:right">${esc(v)}</td></tr>`).join('')}</table>`;

const T = {
  welcome: (inst, { name, role }) => ({
    subject: `Welcome to Anka, ${name}`,
    html: layout({ inst, title: `Welcome, ${name}!`, body: p(`Your <b>${esc(role)}</b> account is ready. You can sign in to view results, rankings and insights.`), cta: { label: 'Open Anka', url: inst.app_url } }),
  }),
  reset: (inst, { name, link }) => ({
    subject: 'Reset your Anka password',
    html: layout({ inst, title: 'Password reset', body: p(`Hello ${esc(name)}, we received a request to reset your password. The link is valid for <b>30 minutes</b> and works once.`) + p('If you did not ask for this, you can ignore this email.'), cta: { label: 'Choose a new password', url: link } }),
  }),
  approved: (inst, { name }) => ({
    subject: 'Your Anka teacher account is approved',
    html: layout({ inst, title: 'Account approved', body: p(`Hello ${esc(name)}, an administrator approved your teacher account. You can now sign in and enter marks for your subjects.`), cta: { label: 'Sign in', url: `${inst.app_url}/login` } }),
  }),
  result: (inst, d) => ({
    subject: `Result published: ${d.termName} ${d.examYear}`,
    html: layout({
      inst, title: `Your ${d.termName} result is out`,
      body: p(`Hello ${esc(d.name)}, the result for <b>${esc(d.programName)} · ${esc(d.termName)}</b> (${esc(d.examYear)}) has been published.`)
        + kv([['Result', d.status === 'pass' ? 'Passed' : 'Reappear'], ['GPA', Number(d.gpa).toFixed(2)], ['Grade', d.grade], ['Percentage', `${d.percentage}%`], ['Class rank', d.rank ? `${d.rank} of ${d.classSize}` : '-'], ['Division', d.division || '-']])
        + (d.verifyUrl ? p(`Anyone can confirm this result is genuine with code <b>${esc(d.verifyCode)}</b>.`) : ''),
      cta: { label: 'View marksheet', url: d.link },
    }),
  }),
  guardian: (inst, d) => ({
    subject: `${d.name}: ${d.termName} result published`,
    html: layout({
      inst, title: `${d.name}'s ${d.termName} result`,
      body: p(`Dear guardian, the ${esc(d.termName)} result of <b>${esc(d.name)}</b> (${esc(d.programName)}) has been published.`)
        + kv([['Result', d.status === 'pass' ? 'Passed' : 'Reappear needed'], ['GPA', Number(d.gpa).toFixed(2)], ['Percentage', `${d.percentage}%`], ['Class rank', d.rank ? `${d.rank} of ${d.classSize}` : '-']]),
      cta: { label: 'Verify this result', url: d.verifyUrl },
    }),
  }),
  risk: (inst, d) => ({
    subject: `Academic support alert for ${d.name}`,
    html: layout({
      inst, title: 'Let us help you get back on track',
      body: p(`Hello ${esc(d.name)}, our early-warning check found some areas that need attention (risk level: <b>${esc(d.level)}</b>).`)
        + `<ul style="margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.6">${d.reasons.map((r) => `<li>${esc(r.text)}</li>`).join('')}</ul>`
        + p('Please speak to your subject teachers or the campus office. Attending at least 80% of classes keeps you eligible for the exam.'),
      cta: { label: 'See my insights', url: `${inst.app_url}/student/insights` },
    }),
  }),
  notice: (inst, { title, body }) => ({
    subject: `Notice: ${title}`,
    html: layout({ inst, title, body: p(esc(body).replace(/\n/g, '<br>')), cta: { label: 'Open Anka', url: inst.app_url } }),
  }),
  test: (inst) => ({
    subject: 'Anka test email',
    html: layout({ inst, title: 'Email is working', body: p('This is a test message from the Anka Mail Center. If you can read this, your Gmail app password is configured correctly.') }),
  }),
};

module.exports = T;
