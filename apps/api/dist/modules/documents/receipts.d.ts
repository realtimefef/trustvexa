export type DocumentKind = 'deal_agreement' | 'dispute_decision' | 'invoice' | 'receipt' | 'data_export' | 'activity_timeline';
export declare const INVOICE_PREFIX = "TVX";
/**
 * Build a unique, human-readable invoice number from a monotonic sequence.
 * Format: TVX-YYYY-000123 (sequence zero-padded to 6 digits).
 */
export declare function invoiceNumber(year: number, sequence: number): string;
export declare function parseInvoiceNumber(value: string): {
    year: number;
    sequence: number;
} | null;
/** Which documents a given role is permitted to download for a deal. */
export declare function canDownloadDocument(kind: DocumentKind, isParty: boolean, isMiddleman: boolean): boolean;
//# sourceMappingURL=receipts.d.ts.map