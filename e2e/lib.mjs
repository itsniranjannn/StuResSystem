import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export const BASE = process.env.UI || 'http://127.0.0.1:5191';
export const API = `${BASE}/api`;
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', process.env.BROWSER].filter(Boolean).find((p) => fs.existsSync(p));
export const OUT = path.resolve('out');
fs.mkdirSync(OUT, { recursive: true });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const results = [];
let group = '';
export const section = (s) => { group = s; console.log(`\n## ${s}`); };

export async function launch() {
  if (!EDGE) throw new Error('No Edge or Chrome found. Set BROWSER=path\\to\\browser.exe');
  return puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,900'] });
}

export async function api(p, { method = 'GET', body, token } = {}) {
  const r = await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
export const tokenFor = async (email, password) => (await api('/auth/login', { method: 'POST', body: { email, password } })).data.token;

// A page that records console errors, uncaught exceptions, failed requests and 5xx responses.
export async function newPage(browser, { token, theme = 'light', width = 1440, height = 900 } = {}) {
  const ctx = await browser.createBrowserContext(); // isolated storage so pages never share a sign-in
  const page = await ctx.newPage();
  const closePage = page.close.bind(page); page.close = async (...a) => { await closePage(...a).catch(() => {}); await ctx.close().catch(() => {}); };
  await page.setViewport({ width, height });
  page.problems = [];
  page.on('dialog', (d) => d.accept().catch(() => {}));
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !/WebGL|GPU stall|swiftshader|GroupMarker/i.test(m.text())) page.problems.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 500) page.problems.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
  page.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(BASE) && !/fonts\.g/.test(u) && r.failure()?.errorText !== 'net::ERR_ABORTED') page.problems.push(`requestfailed: ${u.replace(BASE, '')} ${r.failure()?.errorText}`); });
  await page.evaluateOnNewDocument((tk, th) => { try { if (tk) localStorage.setItem('stures_token', tk); if (!localStorage.getItem('anka_theme')) localStorage.setItem('anka_theme', th); localStorage.setItem('anka_seen', '999999'); } catch { /* ignore */ } }, token || null, theme);
  return page;
}

// ---- interaction helpers (all wait for the element, then act) ----
export const go = async (page, p) => { await page.goto(BASE + p, { waitUntil: 'domcontentloaded' }); await settle(page); };
export async function settle(page) { await page.waitForFunction(() => !document.querySelector('.skeleton'), { timeout: 15000 }).catch(() => {}); await sleep(250); }
export const text = (page) => page.evaluate(() => document.body.innerText);
export async function seeText(page, t, timeout = 12000) {
  await page.waitForFunction((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), { timeout }, t).catch(async () => { throw new Error(`text not found: "${t}". Page says: ${(await text(page)).replace(/\s+/g, ' ').slice(0, 220)}`); });
}
export async function noText(page, t, timeout = 4000) {
  await page.waitForFunction((x) => !document.body.innerText.toLowerCase().includes(x.toLowerCase()), { timeout }, t).catch(() => { throw new Error(`text should be gone: "${t}"`); });
}
export const click = (page, sel) => page.locator(sel).setTimeout(12000).click();
export const clickText = (page, scope, t) => page.locator(`${scope}::-p-text(${t})`).setTimeout(12000).click();
export async function fillSel(page, sel, v) {
  const el = await page.waitForSelector(sel, { timeout: 12000 });
  await el.click({ clickCount: 3 }); await page.keyboard.press('Backspace');
  if (String(v) !== '') await el.type(String(v));
}
export async function typeSel(page, sel, v) { const el = await page.waitForSelector(sel, { timeout: 12000 }); await el.click({ clickCount: 3 }); await el.type(String(v)); }

// Form fields in this app are <div class="field"><label>Label</label><input/></div>
export async function field(page, label, scope = 'body') {
  const h = await page.waitForFunction((sc, lb) => {
    const root = document.querySelector(sc) || document;
    const l = [...root.querySelectorAll('.field > label')].find((x) => x.textContent.trim().toLowerCase().startsWith(lb.toLowerCase()));
    return l ? l.parentElement : null;
  }, { timeout: 12000 }, scope, label);
  return h.asElement();
}
export async function fillField(page, label, value, scope = 'body') {
  const f = await field(page, label, scope); const inp = await f.$('input, textarea');
  if (!inp) throw new Error(`no input in field "${label}"`);
  await inp.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); if (String(value) !== '') await inp.type(String(value));
}
export async function pickField(page, label, option, scope = 'body') {
  const f = await field(page, label, scope); const b = await f.$('.sel-btn'); await b.click();
  await page.locator(`li[role=option]::-p-text(${option})`).setTimeout(8000).click(); await sleep(350); // let the closing list finish animating
}
export async function pickLabel(page, ariaLabel, option) {
  await page.locator(`button.sel-btn[aria-label="${ariaLabel}"]`).setTimeout(12000).click();
  await page.locator(`li[role=option]::-p-text(${option})`).setTimeout(8000).click(); await sleep(350);
}
export const toast = async (page, t) => seeText(page, t, 8000);

// ---- test registry ----
export async function step(name, fn, page) {
  const t0 = Date.now();
  try {
    if (page) page.problems.length = 0;
    await fn();
    if (page && page.problems.length) throw new Error(`browser problems: ${[...new Set(page.problems)].slice(0, 4).join(' | ')}`);
    results.push({ ok: true }); console.log(`  PASS ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    results.push({ ok: false, group, name, err: e.message });
    console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`);
    if (page) { const f = path.join(OUT, `${group.replace(/\W+/g, '_')}-${name.replace(/\W+/g, '_').slice(0, 50)}.png`); await page.screenshot({ path: f }).catch(() => {}); }
  }
}
export function summary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
  failed.forEach((f) => console.log(` - [${f.group}] ${f.name}\n     ${f.err.split('\n')[0]}`));
  return failed.length;
}
