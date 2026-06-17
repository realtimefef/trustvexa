// Safe preview, expiring signed links, and middleman evidence access (task 6.7).
// Pure policy helpers. Storage key signing happens in the storage adapter; the
// expiry and watermark/download policy decisions live here for testability.
// (Requirements 29.4, 29.7, 29.8, 29.9)
/** Default lifetime of a signed preview/download link. */
export const SIGNED_LINK_TTL_SECONDS = 300;
/** A signed link is valid only strictly before its expiry. */
export function isSignedLinkValid(expiresAtIso, nowIso) {
    const expires = Date.parse(expiresAtIso);
    const now = Date.parse(nowIso);
    if (Number.isNaN(expires) || Number.isNaN(now))
        return false;
    return now < expires;
}
/** Compute the expiry timestamp for a freshly minted link. */
export function signedLinkExpiry(nowIso, ttlSeconds = SIGNED_LINK_TTL_SECONDS) {
    const now = Date.parse(nowIso);
    return new Date(now + ttlSeconds * 1000).toISOString();
}
/**
 * Participants get a watermarked in-app preview and no raw download; the
 * middleman may download originals as evidence.
 */
export function previewPolicyFor(viewer) {
    if (viewer === 'middleman') {
        return { watermark: false, allowDownload: true };
    }
    return { watermark: true, allowDownload: false };
}
/** Only the middleman may download originals for evidence. */
export function canDownloadEvidence(viewer) {
    return viewer === 'middleman';
}
//# sourceMappingURL=file-access.js.map