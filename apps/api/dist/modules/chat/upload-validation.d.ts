export type AttachmentKind = 'image' | 'video' | 'voice' | 'document';
export type ScanStatus = 'pending' | 'clean' | 'quarantined' | 'blocked';
export interface UploadLimits {
    maxBytes: bigint;
    allowedMime: readonly string[];
    maxDurationSeconds: number | null;
}
/** Per-kind limits. Sizes use bigint to match the bigint size_bytes column. */
export declare function limitsFor(kind: AttachmentKind): UploadLimits;
export interface UploadCandidate {
    kind: AttachmentKind;
    mimeType: string;
    sizeBytes: bigint;
    durationSeconds?: number | null;
}
export type UploadRejectReason = 'mime_not_allowed' | 'too_large' | 'empty_file' | 'too_long' | 'missing_duration';
export type UploadValidation = {
    ok: true;
} | {
    ok: false;
    reason: UploadRejectReason;
};
/** Validate type, size, and duration against the kind's limits. */
export declare function validateUpload(candidate: UploadCandidate): UploadValidation;
/** An attachment may be delivered/previewed only after a clean scan. */
export declare function canDeliverAttachment(scanStatus: ScanStatus): boolean;
export type ScanAction = 'deliver' | 'hold' | 'quarantine' | 'block';
/** Map a scan status to the delivery action. */
export declare function scanOutcomeAction(scanStatus: ScanStatus): ScanAction;
/** The full acceptance test (Property 19): valid limits AND a clean scan. */
export declare function isUploadAccepted(candidate: UploadCandidate, scanStatus: ScanStatus): boolean;
//# sourceMappingURL=upload-validation.d.ts.map