// Socket.IO JWT handshake authentication (task 6.1).
// Pure decision logic with an injected token verifier and jti denylist check,
// so it is unit-testable without a live socket, JWT secret, or Redis. The
// gateway calls authenticateHandshake on connect AND on reconnect re-auth.
// (Requirements 30.1, 30.3, 3.2)
/**
 * Authenticate a handshake. Order matters: a missing token is reported before
 * an invalid one, expiry before revocation, so the client gets the most
 * specific actionable reason.
 */
export async function authenticateHandshake(rawToken, verify, isDenied, nowEpochSeconds) {
    if (!rawToken || rawToken.trim() === '') {
        return { ok: false, reason: 'missing_token' };
    }
    const identity = verify(rawToken);
    if (!identity) {
        return { ok: false, reason: 'invalid_token' };
    }
    if (identity.exp <= nowEpochSeconds) {
        return { ok: false, reason: 'expired' };
    }
    if (await isDenied(identity.jti)) {
        return { ok: false, reason: 'revoked' };
    }
    return { ok: true, identity };
}
//# sourceMappingURL=handshake.js.map