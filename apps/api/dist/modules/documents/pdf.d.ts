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
export declare function renderPdf(doc: PdfDocument): Buffer;
//# sourceMappingURL=pdf.d.ts.map