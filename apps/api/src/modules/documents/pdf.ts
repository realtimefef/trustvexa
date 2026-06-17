/**
 * Minimal, dependency-free PDF writer (task 7.8 support).
 *
 * Produces a single- or multi-line, single-page A4 PDF from plain text using
 * the built-in Helvetica font. Escrow documents (deal agreement, dispute
 * decision, receipts) are short, text-only records, so a full PDF engine is
 * unnecessary and would add supply-chain surface. The output is a byte-exact,
 * deterministic PDF (no timestamps embedded) so the same input always yields
 * the same bytes, which lets a content hash fingerprint each document.
 *
 * The generator is pure: it returns a `Buffer` and never touches I/O. The
 * service layer is responsible for persisting the bytes to object storage and
 * recording the `deal_documents` row.
 */

const PAGE_WIDTH = 595.28; // A4 width in PostScript points
const PAGE_HEIGHT = 841.89; // A4 height in PostScript points
const MARGIN = 56;
const TITLE_SIZE = 18;
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;

/** Escape the characters that are special inside a PDF text string literal. */
function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Replace characters outside the printable WinAnsi range with '?'. The base
 * Helvetica font only reliably renders Latin text, so non-Latin input is
 * down-converted rather than producing an invalid stream.
 */
function toWinAnsi(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0x3f;
    out += code >= 0x20 && code <= 0xff ? ch : '?';
  }
  return out;
}

export interface PdfDocument {
  readonly title: string;
  /** Body lines, rendered top-to-bottom. Long lines are not auto-wrapped. */
  readonly lines: readonly string[];
}

/**
 * Render a {@link PdfDocument} to PDF bytes. The content stream draws the title
 * then each body line; the cross-reference table offsets are computed exactly
 * so the file is valid per the PDF 1.4 specification.
 */
export function renderPdf(doc: PdfDocument): Buffer {
  const contentLines: string[] = [];
  const startY = PAGE_HEIGHT - MARGIN;

  contentLines.push('BT');
  contentLines.push(`/F1 ${TITLE_SIZE} Tf`);
  contentLines.push(`${MARGIN} ${startY} Td`);
  contentLines.push(`(${escapePdfText(toWinAnsi(doc.title))}) Tj`);
  contentLines.push('ET');

  let y = startY - TITLE_SIZE - LINE_HEIGHT;
  for (const line of doc.lines) {
    if (y < MARGIN) break; // single page only; extra lines are dropped
    contentLines.push('BT');
    contentLines.push(`/F1 ${BODY_SIZE} Tf`);
    contentLines.push(`${MARGIN} ${y} Td`);
    contentLines.push(`(${escapePdfText(toWinAnsi(line))}) Tj`);
    contentLines.push('ET');
    y -= LINE_HEIGHT;
  }

  const content = contentLines.join('\n');
  const contentBytes = Buffer.byteLength(content, 'latin1');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
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
