export type FileViewer = 'participant' | 'middleman';
/** Default lifetime of a signed preview/download link. */
export declare const SIGNED_LINK_TTL_SECONDS = 300;
/** A signed link is valid only strictly before its expiry. */
export declare function isSignedLinkValid(expiresAtIso: string, nowIso: string): boolean;
/** Compute the expiry timestamp for a freshly minted link. */
export declare function signedLinkExpiry(nowIso: string, ttlSeconds?: number): string;
export interface PreviewPolicy {
    watermark: boolean;
    allowDownload: boolean;
}
/**
 * Participants get a watermarked in-app preview and no raw download; the
 * middleman may download originals as evidence.
 */
export declare function previewPolicyFor(viewer: FileViewer): PreviewPolicy;
/** Only the middleman may download originals for evidence. */
export declare function canDownloadEvidence(viewer: FileViewer): boolean;
//# sourceMappingURL=file-access.d.ts.map