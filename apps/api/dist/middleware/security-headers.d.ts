import type { RequestHandler } from 'express';
/**
 * Middleware slot 1 — Security headers (helmet / CSP).
 *
 * Applies the HTTP security headers required by Requirement 44.6:
 *   - Strict-Transport-Security (HSTS)
 *   - Content-Security-Policy (CSP)
 *   - X-Frame-Options
 *   - X-Content-Type-Options
 *   - Referrer-Policy
 *   - Permissions-Policy
 *
 * helmet sets HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and
 * Referrer-Policy. helmet does not set Permissions-Policy, so it is added
 * explicitly below. (Requirements 44.3 slot 1, 44.6)
 */
export declare function securityHeaders(): RequestHandler[];
//# sourceMappingURL=security-headers.d.ts.map