export interface HandshakeIdentity {
    userId: string;
    role: 'user' | 'middleman';
    sessionId: string;
    jti: string;
    exp: number;
}
/** Verifies/decodes an access token. Returns null on any signature/shape failure. */
export type TokenVerifier = (token: string) => HandshakeIdentity | null;
/** Returns true if the jti has been revoked (logout / rotation denylist). */
export type DenylistCheck = (jti: string) => Promise<boolean> | boolean;
export type HandshakeFailure = 'missing_token' | 'invalid_token' | 'expired' | 'revoked';
export type HandshakeResult = {
    ok: true;
    identity: HandshakeIdentity;
} | {
    ok: false;
    reason: HandshakeFailure;
};
/**
 * Authenticate a handshake. Order matters: a missing token is reported before
 * an invalid one, expiry before revocation, so the client gets the most
 * specific actionable reason.
 */
export declare function authenticateHandshake(rawToken: string | null | undefined, verify: TokenVerifier, isDenied: DenylistCheck, nowEpochSeconds: number): Promise<HandshakeResult>;
//# sourceMappingURL=handshake.d.ts.map