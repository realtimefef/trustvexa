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
export declare function renderPdf(doc: PdfDocument): Buffer;
//# sourceMappingURL=pdf.d.ts.map