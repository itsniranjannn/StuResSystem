// Small document builder on top of docx-js that follows the TU BCA project report format:
// A4, Times New Roman 12, 1.5 spacing, justified, margins 1/1/1/1.25 in (top/bottom/right/left),
// headings 16/14/12 bold, roman numerals for preliminary pages then arabic from Chapter 1.
import fs from 'node:fs';
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, Packer, PageNumber, Paragraph, PositionalTab,
  PositionalTabAlignment, PositionalTabLeader, PositionalTabRelativeTo, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, NumberFormat, PageBreak,
} from 'docx';

export const FONT = 'Times New Roman';
const LINE = 360; // 1.5 spacing
const W = 11906, H = 16838; // A4 in DXA
const M = { top: 1440, bottom: 1440, right: 1440, left: 1800 };
export const CONTENT_W = W - M.left - M.right; // 8666 DXA = 6.02 in
const hl = (t, o = {}) => new TextRun({ text: t, font: FONT, highlight: 'yellow', ...o });

// ---- inline markup: **bold**, *italic*, `code`, [[placeholder]] -> yellow highlight
export function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[\[[^\]]+\]\])/g;
  let last = 0; let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), font: FONT, bold: true, ...base }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: 'Courier New', size: 21, ...base }));
    else if (t.startsWith('[[')) out.push(hl(t.slice(2, -2), base));
    else out.push(new TextRun({ text: t.slice(1, -1), font: FONT, italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}

export class Builder {
  constructor(pages = {}) {
    this.pages = pages;              // text -> printed page number (from previous pass)
    this.headings = [];              // { level, text }
    this.figures = []; this.tables = [];
    this.ch = 0; this.figN = 0; this.tabN = 0;
    this.front = []; this.main = []; this.cur = this.front;
  }
  startMain() { this.cur = this.main; }
  push(x) { this.cur.push(...(Array.isArray(x) ? x : [x])); }

  para(text, o = {}) {
    this.push(new Paragraph({
      alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: o.line ?? LINE, before: o.before ?? 0, after: o.after ?? 120 },
      indent: o.indent, keepNext: o.keepNext, keepLines: o.keepLines, children: runs(text, o.run),
    }));
  }
  p(text) { this.para(text); }
  center(text, o = {}) { this.para(text, { align: AlignmentType.CENTER, line: 276, after: o.after ?? 120, run: o.run, before: o.before }); }
  blank(n = 1) { for (let i = 0; i < n; i++) this.push(new Paragraph({ spacing: { line: 276, after: 0 }, children: [new TextRun({ text: '', font: FONT })] })); }
  pageBreak() { this.push(new Paragraph({ children: [new PageBreak()] })); }

  chapter(title) {
    this.ch += 1; this.figN = 0; this.tabN = 0;
    const text = `CHAPTER ${this.ch}: ${title.toUpperCase()}`;
    this.headings.push({ level: 1, text });
    this.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { line: 276, before: 0, after: 240 }, children: [new TextRun({ text, font: FONT, bold: true, size: 32 })] }));
  }
  unnumbered(title, o = {}) { // Abstract, Acknowledgement, References ...
    this.headings.push({ level: 1, text: title.toUpperCase(), front: o.front });
    this.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: o.pageBreak !== false, alignment: AlignmentType.CENTER, spacing: { line: 276, before: 0, after: 240 }, children: [new TextRun({ text: title.toUpperCase(), font: FONT, bold: true, size: 32 })] }));
  }
  h2(text) {
    this.headings.push({ level: 2, text });
    this.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { line: 276, before: 240, after: 120 }, children: [new TextRun({ text, font: FONT, bold: true, size: 28 })] }));
  }
  h3(text) {
    this.headings.push({ level: 3, text });
    this.push(new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { line: 276, before: 180, after: 100 }, children: [new TextRun({ text, font: FONT, bold: true, size: 24 })] }));
  }
  bullets(items) {
    items.forEach((t, i) => this.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE, after: i === items.length - 1 ? 160 : 60 }, children: runs(t) })));
  }
  numbered(items, ref = 'num') {
    items.forEach((t, i) => this.push(new Paragraph({ numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE, after: i === items.length - 1 ? 160 : 60 }, children: runs(t) })));
  }
  code(text) {
    text.split('\n').forEach((l, i, a) => this.push(new Paragraph({
      spacing: { line: 240, after: 0 }, keepLines: true, keepNext: i < a.length - 1,
      shading: { type: ShadingType.CLEAR, fill: 'F2F4F8' }, indent: { left: 120, right: 120 },
      children: [new TextRun({ text: l === '' ? ' ' : l, font: 'Courier New', size: 18 })],
    })));
    this.push(new Paragraph({ spacing: { line: 120, after: 120 }, children: [] }));
  }
  fig(file, caption, widthIn = 5.6) {
    this.figN += 1; const label = `Figure ${this.ch}.${this.figN}: ${caption}`; this.figures.push(label);
    const buf = fs.readFileSync(file); const { w, h } = pngSize(buf);
    const wpx = Math.round(widthIn * 96); const hpx = Math.round((wpx * h) / w);
    this.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: wpx, height: hpx }, altText: { title: label, description: caption, name: label } })] }));
    this.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, after: 200 }, children: [new TextRun({ text: label, font: FONT, size: 22, bold: false })] }));
  }
  table(caption, header, rows, widths, o = {}) {
    this.tabN += 1; const label = `Table ${this.ch}.${this.tabN}: ${caption}`; this.tables.push(label);
    this.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { line: 276, before: 160, after: 80 }, children: [new TextRun({ text: label, font: FONT, size: 22 })] }));
    const total = widths.reduce((a, b) => a + b, 0); const sc = CONTENT_W / total;
    const cw = widths.map((x) => Math.floor(x * sc));
    const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' }; const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (t, i, head) => new TableCell({
      width: { size: cw[i], type: WidthType.DXA }, borders, margins: { top: 50, bottom: 50, left: 90, right: 90 },
      shading: head ? { type: ShadingType.CLEAR, fill: 'E3E8F2' } : undefined,
      children: String(t).split('\n').map((l) => new Paragraph({ spacing: { line: 252, after: 0 }, alignment: o.center?.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT, children: runs(l, { size: 21, bold: head }) })),
    });
    this.push(new Table({
      width: { size: cw.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: cw,
      rows: [new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, i, true)) }), ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))],
    }));
    this.push(new Paragraph({ spacing: { line: 120, after: 120 }, children: [] }));
  }

  // ---- static contents lists (page numbers come from the previous render pass)
  tocEntry(text, level, key = text) {
    const page = this.pages[key] ?? '0';
    return new Paragraph({
      spacing: { line: 276, after: level === 1 ? 80 : 40 }, indent: { left: level === 1 ? 0 : level === 2 ? 360 : 720 },
      children: [new TextRun({ text, font: FONT, bold: level === 1, size: 24 }), new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.DOT }), page], font: FONT, size: 24 })],
    });
  }
  list(entries) { entries.forEach(([t, lvl]) => this.push(this.tocEntry(t, lvl))); }
}

function pngSize(b) { return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }

export function assemble(b, { titleSection }) {
  const footer = (fmt) => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24 })] })] });
  const page = (fmt, start) => ({ size: { width: W, height: H }, margin: M, pageNumbers: { start, formatType: fmt } });
  return new Document({
    creator: 'Niranjan Katwal', title: 'Anka: Student Result Analysis and Ranking System',
    styles: { default: { document: { run: { font: FONT, size: 24 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true }, paragraph: { spacing: { before: 0, after: 240 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 180, after: 100 }, keepNext: true, outlineLevel: 2 } },
      ] },
    numbering: { config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'num2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'num3', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ] },
    sections: [
      { properties: { page: page(NumberFormat.DECIMAL, 1), titlePage: true }, footers: { default: new Footer({ children: [] }), first: new Footer({ children: [] }) }, children: titleSection },
      ...(b.front.length ? [{ properties: { page: page(NumberFormat.LOWER_ROMAN, 1) }, footers: { default: footer() }, children: b.front }] : []),
      { properties: { page: page(NumberFormat.DECIMAL, 1) }, footers: { default: footer() }, children: b.main },
    ],
  });
}

export async function save(doc, file) { fs.writeFileSync(file, await Packer.toBuffer(doc)); }
export { Paragraph, TextRun, AlignmentType, ImageRun };
