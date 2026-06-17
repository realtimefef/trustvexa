// Socket.IO JWT handshake authentication (task 6.1).
// Pure decision logic with an injected token verifier and jti denylist check,
// so it is unit-testable without a live socket, JWT secret, or Redis. The
// gateway calls authenticateHandshake on connect AND on reconnect re-auth.
// (Requirements 30.1, 30.3, 3.2)

export interface HandshakeIdentity {
  userId: string;
  role: 'user' | 'middleman';
  sessionId: string;
  jti: string;
  exp: number; // epoch seconds
}

/** Verifies/decodes an access token. Returns null on any signature/shape failure. */
export type TokenVerifier = (token: string) => HandshakeIdentity | null;

/** Returns true if the jti has been revoked (logout / rotation denylist). */
export type DenylistCheck = (jti: string) => Promise<boolean> | boolean;

export type HandshakeFailure = 'missing_token' | 'invalid_token' | 'expired' | 'revoked';

export type HandshakeResult =
  | { ok: true; identity: HandshakeIdentity }
  | { ok: false; reason: HandshakeFailure };

/**
 * Authenticate a handshake. Order matters: a missing token is reported before
 * an invalid one, expiry before revocation, so the client gets the most
 * specific actionable reason.
 */
export async function authenticateHandshake(
  rawToken: string | null | undefined,
  verify: TokenVerifier,
  isDenied: DenylistCheck,
  nowEpochSeconds: number,
): Promise<HandshakeResult> {
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
