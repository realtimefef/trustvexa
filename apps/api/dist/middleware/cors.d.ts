import type { RequestHandler } from 'express';
/**
 * Middleware slot 2 — CORS.
 *
 * Allows the configured frontend origins (from `CORS_ORIGINS`) to call the API
 * with credentials (the refresh-token cookie). When no origins are configured
 * (local scaffold), requests with no Origin header (same-origin, curl) are
 * permitted and cross-origin browser requests are rejected. (Requirement 44.3
 * slot 2)
 */
export declare function corsMiddleware(): RequestHandler;
//# sourceMappingURL=cors.d.ts.map