/**
 * Pure invite-token helpers (task 4.3, validated by Property 16 in task 4.4).
 *
 * Side-effect free so they can be unit/property tested and reused. The
 * plaintext token is shown to the seller exactly once; only its HMAC hash is
 * ever persisted (Requirement 8.1).
 */
import { randomBytes } from 'node:crypto';
import { hashLookup } from '@trustvexa/shared';
/** Bytes of entropy in an invite token (256-bit). */
export const INVITE_TOKEN_BYTES = 32;
/** Generate a URL-safe, high-entropy invite token (base64url, no padding). */
export function generateInviteToken() {
    return randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
}
/** Deterministic HMAC hash of a token for blind-index storage / lookup. */
export function hashInviteToken(token, key) {
    return hashLookup(token, key);
}
/**
 * Decide whether an invite may still be accepted. Revocation and prior use are
 * terminal; expiry is evaluated against `now`. Checked in priority order so a
 * revoked-and-expired invite reports `revoked`. (Requirements 8.3, 8.4, 8.5)
 */
export function evaluateInvite(state, now = new Date()) {
    if (state.revokedAt !== null) {
        return 'revoked';
    }
    if (state.singleUse && state.usedAt !== null) {
        return 'used';
    }
    if (state.expiresAt !== null && new Date(state.expiresAt).getTime() <= now.getTime()) {
        return 'expired';
    }
    return 'ok';
}
//# sourceMappingURL=invite-token.js.map