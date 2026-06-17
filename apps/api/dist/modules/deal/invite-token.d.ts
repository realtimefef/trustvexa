/** Bytes of entropy in an invite token (256-bit). */
export declare const INVITE_TOKEN_BYTES = 32;
/** Generate a URL-safe, high-entropy invite token (base64url, no padding). */
export declare function generateInviteToken(): string;
/** Deterministic HMAC hash of a token for blind-index storage / lookup. */
export declare function hashInviteToken(token: string, key: Buffer | string): string;
export type InviteUsability = 'ok' | 'used' | 'revoked' | 'expired';
export interface InviteState {
    readonly usedAt: string | null;
    readonly revokedAt: string | null;
    readonly expiresAt: string | null;
    readonly singleUse: boolean;
}
/**
 * Decide whether an invite may still be accepted. Revocation and prior use are
 * terminal; expiry is evaluated against `now`. Checked in priority order so a
 * revoked-and-expired invite reports `revoked`. (Requirements 8.3, 8.4, 8.5)
 */
export declare function evaluateInvite(state: InviteState, now?: Date): InviteUsability;
//# sourceMappingURL=invite-token.d.ts.map