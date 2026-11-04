// Reads the exported PDF, finds the printed page of every heading, figure and table, and writes pages.json
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const DOC = path.join(here, '..');
const pdf = process.argv[2] || path.join(DOC, 'Anka_Project_Report.pdf');
const txt = execSync(`pdftotext -layout "${pdf}" -`, { maxBuffer: 1 << 28 }).toString().split('\f'); txt.pop();
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const lines = txt.map((p) => p.split('\n').map(norm).filter(Boolean));
const { headings, figures, tables, front } = JSON.parse(fs.readFileSync(path.join(here, 'headings.json'), 'utf8'));
const lastPage = (text) => { const t = norm(text).slice(0, 26); let hit = -1; lines.forEach((ls, i) => { if (ls.some((l) => (l.startsWith(t) || (/^(Table|Figure) /.test(t) && l.includes(t))) && !DOTS.test(l))) hit = i; }); return hit; };
const DOTS = /\.{4,}/;
const firstPage = (text) => lines.findIndex((ls) => ls.some((l) => l.endsWith(norm(text)) && !DOTS.test(l)));
const ch1 = lastPage('CHAPTER 1: INTRODUCTION'); if (ch1 < 0) throw new Error('chapter 1 not found');
const roman = (n) => ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv'][n];
const pages = {};
front.forEach((t) => { const p = firstPage(t); pages[t] = p < 0 ? '?' : roman(p); }); // page 1 (index 0) is the unnumbered title page
const miss = [];
for (const h of headings) { const p = lastPage(h.text); if (p < ch1) { miss.push(h.text); continue; } pages[h.text] = String(p - ch1 + 1); }
for (const l of [...figures, ...tables]) { const p = lastPage(l); if (p < ch1) { miss.push(l); continue; } pages[l] = String(p - ch1 + 1); }
fs.writeFileSync(path.join(here, 'pages.json'), JSON.stringify(pages, null, 1));
console.log('pdf pages', txt.length, 'front pages', ch1, 'main pages', txt.length - ch1, 'missing', miss.length, miss.slice(0, 5));
