import type { RequestHandler } from 'express';
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
export declare function jwtAuth(): RequestHandler;
//# sourceMappingURL=auth.d.ts.map