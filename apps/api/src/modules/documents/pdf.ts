/**
 * Minimal, dependency-free PDF writer (task 7.8 support).
 *
 * Produces a branded, single-page A4 PDF from a title + plain text lines using
 * the built-in Helvetica / Helvetica-Bold fonts. Escrow documents (deal
 * agreement, receipt, dispute decision) are short records, so a full PDF engine
 * is unnecessary and would add supply-chain surface. The output is
 * deterministic (no embedded timestamps) so the same input yields the same
 * bytes, which lets a content hash fingerprint each document.
 *
 * Layout: a coloured brand header band, the document title, then the body lines
 * formatted as "Label: value" rows (label greyed, value emphasised) with blank
 * lines becoming spacing and ALL-CAPS / trailing-colon lines becoming section
 * headings, finished with a footer rule + fine print.
 *
 * The generator is pure: it returns a `Buffer` and never touches I/O.
 */

const PAGE_WIDTH = 595.28; // A4 width in PostScript points
const PAGE_HEIGHT = 841.89; // A4 height in PostScript points
const MARGIN = 56;
const HEADER_H = 84;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 17;
const VALUE_X = MARGIN + 150;

// Brand violet (#7c3aed) and greys, as PDF 0..1 RGB triplets.
const BRAND = '0.486 0.227 0.929';
const WHITE = '1 1 1';
const INK = '0.09 0.09 0.11';
const GREY = '0.42 0.45 0.5';
const RULE = '0.85 0.86 0.9';

/** Escape the characters that are special inside a PDF text string literal. */
function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Replace characters outside the printable WinAnsi range with '?'. The base
 * Helvetica font only reliably renders Latin text.
 */
function toWinAnsi(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0x3f;
    out += code >= 0x20 && code <= 0xff ? ch : '?';
  }
  return out;
}

/** Approximate Helvetica advance so long values wrap instead of overflowing. */
function wrapText(text: string, size: number, maxWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / (size * 0.5)));
  if (text.length <= maxChars) return [text];
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') { cur = w; }
    else if ((cur + ' ' + w).length <= maxChars) { cur += ' ' + w; }
    else { out.push(cur); cur = w; }
    // Hard-break a single very long token (e.g. an address/hash).
    while (cur.length > maxChars) {
      out.push(cur.slice(0, maxChars));
      cur = cur.slice(maxChars);
    }
  }
  if (cur) out.push(cur);
  return out;
}

export interface PdfDocument {
  readonly title: string;
  /** Small line under the brand name in the header band. */
  readonly subtitle?: string;
  /** Body lines, rendered top-to-bottom. "Label: value" lines are formatted. */
  readonly lines: readonly string[];
  /** Fine print rendered above the bottom margin. */
  readonly footer?: string;
}

/** Render a {@link PdfDocument} to branded PDF bytes (valid per PDF 1.4). */
export function renderPdf(doc: PdfDocument): Buffer {
  const ops: string[] = [];

  const text = (x: number, y: number, size: number, font: 'F1' | 'F2', color: string, value: string): void => {
    ops.push(`${color} rg`);
    ops.push('BT');
    ops.push(`/${font} ${size} Tf`);
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    ops.push(`(${escapePdfText(toWinAnsi(value))}) Tj`);
    ops.push('ET');
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    ops.push(`${color} rg`);
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    ops.push('f');
  };

  // ── Header band ──
  rect(0, PAGE_HEIGHT - HEADER_H, PAGE_WIDTH, HEADER_H, BRAND);
  text(MARGIN, PAGE_HEIGHT - 42, 22, 'F2', WHITE, 'TrustVexa');
  text(MARGIN, PAGE_HEIGHT - 62, 10, 'F1', WHITE, doc.subtitle ?? 'Secure crypto escrow');

  // ── Title ──
  let y = PAGE_HEIGHT - HEADER_H - 30;
  text(MARGIN, y, 16, 'F2', INK, doc.title);
  y -= 10;
  rect(MARGIN, y, PAGE_WIDTH - 2 * MARGIN, 1, BRAND);
  y -= LINE_HEIGHT + 4;

  // ── Body ──
  for (const raw of doc.lines) {
    if (y < MARGIN + 40) break; // leave room for the footer; single page only
    const line = raw ?? '';
    if (line.trim() === '') { y -= 9; continue; }

    const colon = line.indexOf(': ');
    const isHeading = colon === -1 && (line.endsWith(':') || line === line.toUpperCase());

    if (isHeading) {
      y -= 4;
      text(MARGIN, y, 11.5, 'F2', BRAND, line.replace(/:$/, ''));
      y -= LINE_HEIGHT;
      continue;
    }

    if (colon !== -1) {
      const label = line.slice(0, colon);
      const value = line.slice(colon + 2);
      text(MARGIN, y, BODY_SIZE, 'F1', GREY, label);
      const wrapped = wrapText(value, BODY_SIZE, PAGE_WIDTH - VALUE_X - MARGIN);
      for (let i = 0; i < wrapped.length; i += 1) {
        if (y < MARGIN + 40) break;
        text(VALUE_X, y, BODY_SIZE, 'F2', INK, wrapped[i] ?? '');
        y -= LINE_HEIGHT;
      }
      continue;
    }

    // Plain paragraph line — wrap across the full content width.
    const wrapped = wrapText(line, BODY_SIZE, PAGE_WIDTH - 2 * MARGIN);
    for (const w of wrapped) {
      if (y < MARGIN + 40) break;
      text(MARGIN, y, BODY_SIZE, 'F1', INK, w);
      y -= LINE_HEIGHT;
    }
  }

  // ── Footer ──
  rect(MARGIN, MARGIN + 24, PAGE_WIDTH - 2 * MARGIN, 0.7, RULE);
  text(MARGIN, MARGIN + 10, 8.5, 'F1', GREY,
    doc.footer ?? 'Generated by TrustVexa - trustvexa.com - This is a system-generated document.');

  const content = ops.join('\n');
  const contentBytes = Buffer.byteLength(content, 'latin1');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets: number[] = [];
  let cursor = Buffer.byteLength(header, 'latin1');

  objects.forEach((obj, index) => {
    offsets.push(cursor);
    const chunk = `${index + 1} 0 obj\n${obj}\nendobj\n`;
    body += chunk;
    cursor += Buffer.byteLength(chunk, 'latin1');
  });

  const xrefOffset = cursor;
  const count = objects.length + 1;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${count} /Root 1 0 R >>\n` + `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(header + body + xref + trailer, 'latin1');
}
