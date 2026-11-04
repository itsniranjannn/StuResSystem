// Email service. Credentials come ONLY from .env (EMAIL_USER, EMAIL_APP_PASSWORD) and are never stored in the database.
// Every message is written to email_logs first, then a single background worker sends it with retries,
// so publishing results never blocks on the mail server and nothing is lost if Gmail is slow.
require('dotenv').config();
const nodemailer = require('nodemailer');
const { query } = require('../config/db');

const cfg = () => ({
  user: (process.env.EMAIL_USER || '').trim(),
  pass: (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, ''), // Google shows app passwords in 4-letter groups
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : Number(process.env.SMTP_PORT || 465) === 465,
  fromName: process.env.EMAIL_FROM_NAME || 'Anka Results',
});

const isConfigured = () => {
  const c = cfg();
  return !!(c.user && (c.pass || process.env.SMTP_HOST));
};

let transport = null;
let transportKey = '';
function getTransport() {
  const c = cfg();
  const key = JSON.stringify([c.user, c.host, c.port, c.secure, !!c.pass]);
  if (!transport || key !== transportKey) {
    transport = nodemailer.createTransport({
      host: c.host, port: c.port, secure: c.secure,
      auth: c.pass ? { user: c.user, pass: c.pass } : undefined,
      tls: process.env.SMTP_HOST ? { rejectUnauthorized: false } : undefined, // only for local test servers
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    });
    transportKey = key;
  }
  return transport;
}

let running = false;
async function processQueue() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const [job] = await query("SELECT * FROM email_logs WHERE status = 'queued' AND attempts < 3 ORDER BY id LIMIT 1");
      if (!job) break;
      const c = cfg();
      if (isReserved(job.to_email)) { await query("UPDATE email_logs SET status='skipped', error='Demo address (reserved domain): not delivered' WHERE id=?", [job.id]); continue; }
      try {
        await getTransport().sendMail({
          from: `"${c.fromName}" <${c.user}>`, to: job.to_email, subject: job.subject, html: job.html,
          text: job.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        });
        await query("UPDATE email_logs SET status='sent', attempts=attempts+1, sent_at=NOW(), error=NULL WHERE id=?", [job.id]);
      } catch (e) {
        const attempts = job.attempts + 1;
        await query('UPDATE email_logs SET status=?, attempts=?, error=? WHERE id=?', [attempts >= 3 ? 'failed' : 'queued', attempts, String(e.message).slice(0, 290), job.id]);
        await new Promise((r) => setTimeout(r, 1500 * attempts));
      }
      await new Promise((r) => setTimeout(r, 350)); // gentle pacing; Gmail allows roughly 500 messages a day
    }
  } finally {
    running = false;
  }
}

// Queue one email. When SMTP is not configured the message is kept as 'skipped' so the app stays usable.
// Addresses on reserved or documentation domains can never receive mail. Demo data uses them, so they are logged
// but never handed to the mail server: seeding or testing can not spam a real mailbox or earn bounce messages.
const RESERVED = /(^|\.)(test|invalid|example|localhost)$|(^|\.)example\.(com|org|net)$/i;
const isReserved = (addr) => RESERVED.test(String(addr).split('@')[1] || '');

async function sendMail({ to, subject, html, kind = 'general' }) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return null;
  const demo = isReserved(to);
  const status = isConfigured() && !demo ? 'queued' : 'skipped';
  const why = demo ? 'Demo address (reserved domain): not delivered' : 'Email is not configured (set EMAIL_USER and EMAIL_APP_PASSWORD)';
  const r = await query('INSERT INTO email_logs (to_email, subject, kind, html, status, error) VALUES (?,?,?,?,?,?)',
    [to, subject.slice(0, 200), kind, html, status, status === 'skipped' ? why : null]);
  if (status === 'queued') setImmediate(() => processQueue().catch((e) => console.error('mail worker', e.message)));
  return r.insertId;
}

async function verifyConnection() {
  if (!isConfigured()) return { ok: false, error: 'Not configured' };
  try { await getTransport().verify(); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
}

const resume = () => { if (isConfigured()) processQueue().catch(() => {}); };

module.exports = { sendMail, isReserved, isConfigured, verifyConnection, processQueue, resume, cfg };
