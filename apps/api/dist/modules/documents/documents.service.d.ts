import { type DocumentKind } from './receipts.js';
type Role = 'buyer' | 'seller' | 'middleman';
export interface DocumentEntry {
    kind: DocumentKind;
    label: string;
    /** True when this role may download the document for this deal. */
    permitted: boolean;
    /** True once the rendered file exists; false until rendering is wired. */
    ready: boolean;
}
export interface DealDocuments {
    dealId: string;
    role: Role;
    documents: DocumentEntry[];
}
export declare function listDealDocuments(userId: string, dealId: string): Promise<DealDocuments>;
export declare function buildAgreementPdf(userId: string, dealId: string): Promise<{
    buffer: Buffer;
    documentNumber: string;
}>;
export declare function buildReceiptPdf(userId: string, dealId: string): Promise<{
    buffer: Buffer;
    documentNumber: string;
}>;
export declare function buildDisputeDecisionPdf(userId: string, dealId: string): Promise<{
    buffer: Buffer;
    documentNumber: string;
}>;
export interface UserDataExport {
    generatedAt: string;
    profile: {
        id: string;
        username: string;
        accountLabel: string | null;
        trustLevel: number | null;
        createdAt: string | null;
    } | null;
    deals: Array<{
        id: string;
        role: 'buyer' | 'seller';
        coin: string;
        network: string;
        dealAmount: string | null;
        status: string;
        createdAt: string | null;
    }>;
    reviewsGiven: Array<{
        dealId: string;
        rating: number;
        comment: string | null;
        createdAt: string | null;
    }>;
}
/**
 * Build the caller's own data export (profile, their deals, and the reviews
 * they have written), never exposing another user's private info. Returns a
 * plain JSON-serializable object the controller streams as a download.
 * (Requirement 37.3)
 */
export declare function buildDataExport(userId: string): Promise<UserDataExport>;
export {};
//# sourceMappingURL=documents.service.d.ts.map