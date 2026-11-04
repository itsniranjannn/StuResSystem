const { query } = require('../config/db');

// Every institution detail shown anywhere (marksheets, emails, headers, footer) comes from here and is editable by the admin.
// Defaults are deliberately generic so a fresh install never shows another institution's name.
const DEFAULTS = {
  institution_name: '',
  institution_short: '',
  institution_tagline: '',
  institution_address: '',
  institution_email: '',
  institution_phone: '',
  institution_website: '',
  app_url: process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5191',
};

async function getAll() {
  const rows = await query('SELECT k, v FROM settings');
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.k, r.v])) };
}

async function setMany(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in DEFAULTS)) continue;
    await query('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, String(v).slice(0, 300)]);
  }
}

// The subset that is safe to show to anyone, including signed-out visitors.
const publicView = (s) => ({ name: s.institution_name, short: s.institution_short, tagline: s.institution_tagline, address: s.institution_address, email: s.institution_email, phone: s.institution_phone, website: s.institution_website });

module.exports = { getAll, setMany, publicView, DEFAULTS };
