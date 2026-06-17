// Documents, receipts, and unique invoice numbering (task 7.8). Pure helpers
// for deterministic invoice/receipt numbers and document kind routing. PDF
// rendering itself is performed by the service layer.
// (Requirements 37.1-37.4)
export const INVOICE_PREFIX = 'TVX';
/**
 * Build a unique, human-readable invoice number from a monotonic sequence.
 * Format: TVX-YYYY-000123 (sequence zero-padded to 6 digits).
 */
export function invoiceNumber(year, sequence) {
    if (!Number.isInteger(year) || year < 2000)
        throw new Error('invalid invoice year');
    if (!Number.isInteger(sequence) || sequence < 1)
        throw new Error('invalid invoice sequence');
    const seq = sequence.toString().padStart(6, '0');
    return `${INVOICE_PREFIX}-${year}-${seq}`;
}
const INVOICE_RE = new RegExp(`^${INVOICE_PREFIX}-(\\d{4})-(\\d{6})$`);
export function parseInvoiceNumber(value) {
    const m = INVOICE_RE.exec(value);
    if (!m || m[1] === undefined || m[2] === undefined)
        return null;
    return { year: Number.parseInt(m[1], 10), sequence: Number.parseInt(m[2], 10) };
}
// Document kinds a deal party (buyer/seller) may download for their own deal.
const PARTY_DOWNLOADABLE = new Set([
    'deal_agreement',
    'dispute_decision',
    'invoice',
    'receipt',
    'data_export',
    'activity_timeline',
]);
/** Which documents a given role is permitted to download for a deal. */
export function canDownloadDocument(kind, isParty, isMiddleman) {
    if (isMiddleman)
        return true;
    if (!isParty)
        return false;
    return PARTY_DOWNLOADABLE.has(kind);
}
//# sourceMappingURL=receipts.js.map