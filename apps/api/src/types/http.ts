/**
 * Express request augmentations used across the middleware stack.
 *
 * These fields are populated as the request flows through the ordered
 * middleware chain (request id, JWT auth context, idempotency key).
 */

/** Auth context attached by the JWT auth middleware (task 3.5). */
export interface AuthContext {
  /** Authenticated user id, or `null` for an unauthenticated request. */
  readonly userId: string | null;
  /** Account role from `users.account_type`, or `null` when unauthenticated. */
  readonly role: 'user' | 'middleman' | null;
  /** Session id (`sid`) the access token belongs to. */
  readonly sessionId: string | null;
  /** Access-token id (`jti`), used for revocation on logout. */
  readonly jti: string | null;
  /** Access-token expiry (epoch seconds), used to bound denylist TTL. */
  readonly tokenExp: number | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Unique per-request id, also returned in the error envelope. */
      requestId: string;
      /** Auth context populated by the JWT auth middleware. */
      auth?: AuthContext;
      /** Idempotency-Key header value for money/state-changing requests. */
      idempotencyKey?: string;
    }
  }
}

export {};
