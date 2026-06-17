import type { AttachmentKind, ScanStatus } from './upload-validation.js';
export interface AttachmentTxClient {
    query<R>(text: string, params?: unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface InsertAttachmentInput {
    messageId: string;
    kind: AttachmentKind;
    fileKey: string;
    mimeType: string;
    sizeBytes: bigint;
    durationSeconds?: number | null;
}
export interface AttachmentRow {
    id: string;
    message_id: string;
    kind: AttachmentKind;
    scan_status: ScanStatus;
}
export declare function insertAttachment(client: AttachmentTxClient, input: InsertAttachmentInput): Promise<AttachmentRow>;
/** Update the malware-scan outcome, optionally quarantining. */
export declare function setScanStatus(client: AttachmentTxClient, attachmentId: string, scanStatus: ScanStatus, quarantineReason: string | null): Promise<void>;
/** Mint an expiring signed-link record for a viewer. */
export declare function createAccessLink(client: AttachmentTxClient, attachmentId: string, userId: string | null, signedUrlHash: string, expiresAtIso: string): Promise<void>;
/** Audit a preview or download action. */
export declare function recordPreviewEvent(client: AttachmentTxClient, attachmentId: string, userId: string | null, action: 'preview' | 'download'): Promise<void>;
export interface AttachmentDetails {
    id: string;
    message_id: string;
    kind: AttachmentKind;
    file_key: string;
    mime_type: string;
    size_bytes: string;
    scan_status: ScanStatus;
    quarantine_reason: string | null;
}
export declare function getAttachmentById(client: AttachmentTxClient, id: string): Promise<AttachmentDetails | null>;
//# sourceMappingURL=attachment.repository.d.ts.map