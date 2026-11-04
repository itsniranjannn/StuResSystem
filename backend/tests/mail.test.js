// Proves the email pipeline end to end against a local SMTP server (no real mailbox needed):
// queue row -> background worker -> SMTP delivery -> status 'sent', plus the 'skipped' path when unconfigured.
const test = require('node:test');
const assert = require('node:assert');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '2599';
process.env.SMTP_SECURE = 'false';
process.env.EMAIL_USER = 'anka-test@example.test';
process.env.EMAIL_APP_PASSWORD = '';

const { sendMail, processQueue } = require('../utils/mailer');
const T = require('../utils/emailTemplates');
const { query, pool } = require('../config/db');
const settings = require('../utils/settings');

test('queued email is delivered via SMTP and logged as sent', async () => {
  const received = [];
  const server = new SMTPServer({
    authOptional: true, disabledCommands: ['STARTTLS'],
    onData(stream, session, cb) { simpleParser(stream).then((m) => { received.push(m); cb(); }).catch(cb); },
  });
  await new Promise((r) => server.listen(2599, '127.0.0.1', r));
  try {
    const inst = await settings.getAll();
    const m = T.result(inst, { name: 'Test Student', programName: 'BCA', termName: 'Semester 7', examYear: 2026, status: 'pass', gpa: 3.5, grade: 'A-', percentage: 82.5, rank: 2, classSize: 14, division: 'Distinction', verifyCode: 'ABCD234567', verifyUrl: 'http://x/verify/ABCD234567', link: 'http://x' });
    const id = await sendMail({ to: 'student@school.org', subject: m.subject, html: m.html, kind: 'result' });
    await processQueue();
    const [row] = await query('SELECT status, attempts FROM email_logs WHERE id = ?', [id]);
    assert.equal(row.status, 'sent');
    assert.equal(received.length >= 1, true);
    const msg = received[received.length - 1];
    assert.match(msg.subject, /Result published/);
    assert.match(msg.html, /ABCD234567/);
    assert.match(msg.html, /3\.50/);
  } finally {
    server.close();
  }
});

test('failed delivery is retried then marked failed', async () => {
  const id = await sendMail({ to: 'nobody@school.org', subject: 'will fail', html: '<p>x</p>', kind: 'test' }); // server from test 1 is closed
  await processQueue();
  const [row] = await query('SELECT status, attempts, error FROM email_logs WHERE id = ?', [id]);
  assert.equal(row.status, 'failed');
  assert.equal(row.attempts, 3);
  assert.ok(row.error);
});

test('reserved demo domains are logged but never sent, even when email is configured', async () => {
  const id = await sendMail({ to: 'someone@anka.test', subject: 'demo', html: '<p>x</p>', kind: 'test' });
  const [row] = await query('SELECT status, attempts, error FROM email_logs WHERE id = ?', [id]);
  assert.equal(row.status, 'skipped'); assert.equal(row.attempts, 0); assert.match(row.error, /Demo address/);
  await query('DELETE FROM email_logs WHERE id = ?', [id]);
});

test('invalid recipient is ignored', async () => {
  assert.equal(await sendMail({ to: 'not-an-email', subject: 's', html: 'h' }), null);
});

test.after(async () => {
  // Leave no trace: these rows must not show up in a real Mail Center.
  await query("DELETE FROM email_logs WHERE to_email LIKE '%@school.org' OR to_email LIKE '%@demo.test'");
  await pool.end();
});
