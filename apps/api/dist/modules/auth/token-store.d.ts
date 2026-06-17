export type RevocationReason = 'logout' | 'logout_all' | 'password_change' | 'blocked' | 'rotation';
/** Stable hash for storing opaque tokens at rest (auth_tokens.token_hash). */
export declare function hashToken(token: string): string;
/** Add a jti to the Redis denylist (TTL until expiry) and the durable mirror. */
export declare function revokeJti(params: {
    jti: string;
    userId: string | null;
    reason: RevocationReason;
    expiresAt: Date;
}): Promise<void>;
/** True if the jti is revoked. Checks Redis first, then the durable mirror. */
export declare function isJtiRevoked(jti: string): Promise<boolean>;
//# sourceMappingURL=token-store.d.ts.map