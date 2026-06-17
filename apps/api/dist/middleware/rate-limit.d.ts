import type { RequestHandler } from 'express';
/**
 * Middleware slot 8 — Redis fixed-window rate limiter (task 3.9,
 * Requirements 33.1–33.3, 44.3/44.4).
 *
 * Counts requests per (route, client) inside a fixed time window using a Redis
 * counter (INCR + EXPIRE). Emits the standard `RateLimit-*` headers and rejects
 * with HTTP 429 + `Retry-After` once the budget is exceeded.
 *
 * Fail-open vs fail-closed behaviour:
 *   - When `failClosed` is false (default, global routes): fails open so an
 *     infrastructure blip never takes the whole API down.
 *   - When `failClosed` is true (auth/financial routes): falls back to an
 *     in-process sliding-window map so rate limits remain active during a Redis
 *     outage. (Audit FIX-P1-5)
 *
 * Authenticated callers are keyed by user id (after slot 6); anonymous callers
 * by client IP (honouring `X-Forwarded-For` behind the Render proxy).
 */
export interface RateLimitOptions {
    /** Window length in seconds (default 60). */
    windowSeconds?: number;
    /** Max requests allowed per window (default 120). */
    max?: number;
    /** Redis key prefix (default 'rl'). */
    prefix?: string;
    /**
     * When true, fall back to an in-process rate-limit counter when Redis is
     * unavailable rather than failing open. Use for auth/financial endpoints
     * where brute-force protection must remain active even during Redis outages.
     * Default: false.
     */
    failClosed?: boolean;
}
export declare function rateLimiter(options?: RateLimitOptions): RequestHandler;
//# sourceMappingURL=rate-limit.d.ts.map