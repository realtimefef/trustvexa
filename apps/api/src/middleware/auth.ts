import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import { getAuthConfig } from '../modules/auth/auth.config.js';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { isJtiRevoked } from '../modules/auth/token-store.js';
import type { AuthContext } from '../types/http.js';

const ANONYMOUS: AuthContext = {
  userId: null,
  role: null,
  sessionId: null,
  jti: null,
  tokenExp: null,
};

function extractBearer(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null;
  }
  return value.trim();
}

/**
 * Middleware slot 6 — JWT auth (task 3.5).
 *
 * Verifies the Bearer access token on every API request: signature, issuer,
 * audience, expiry, and the `jti` revocation denylist (Redis mirrored in
 * `revoked_tokens`). A request with no token is allowed through as anonymous
 * (`req.auth` userId null) so public routes work; the role guard (slot 7)
 * rejects anonymous access to protected routes. A present-but-invalid or
 * revoked token is rejected with 401. Client role claims are never trusted —
 * the role is read from the signed token, which the server minted from
 * `users.account_type`. (Requirements 3.2, 3.5, 3.6, 44.5)
 */
export function jwtAuth(): RequestHandler {
  return (req, _res, next) => {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      req.auth = ANONYMOUS;
      next();
      return;
    }
    void (async () => {
      try {
        const cfg = getAuthConfig();
        const claims = verifyAccessToken(token, cfg);
        if (await isJtiRevoked(claims.jti)) {
          throw new AppError('token_revoked', 'Authentication token has been revoked.', 401);
        }
        req.auth = {
          userId: claims.sub,
          role: claims.role,
          sessionId: claims.sid,
          jti: claims.jti,
          tokenExp: claims.exp,
        };
        next();
      } catch (err) {
        if (err instanceof AppError) {
          next(err);
        } else {
          next(new AppError('invalid_token', 'Authentication token is invalid or expired.', 401));
        }
      }
    })();
  };
}
