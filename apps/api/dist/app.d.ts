import './types/http.js';
import { type Express } from 'express';
/**
 * Builds the Express application with the fixed middleware stack in its exact,
 * normative order (Requirement 44.3):
 *
 *   1. Security headers (helmet / CSP, + HSTS, X-Frame-Options,
 *      X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — 44.6
 *   2. CORS
 *   3. Request ID + structured logging
 *   4. Body parse
 *   --- per-route (applied inside the router via apiChain) ---
 *   5. Zod validation
 *   6. JWT auth        (verify Bearer access token, jti denylist)
 *   7. Role guard      (server-side role authorization)
 *   8. Rate limiter    (Redis fixed-window, RateLimit-* headers, 429)
 *   9. Idempotency-Key (presence; replay/serialization via runMoneyWrite)
 *   10. Handler
 *   --- after the router ---
 *   11. Centralized error handler -> envelope { error_code, message, request_id }
 */
export declare function createApp(): Express;
//# sourceMappingURL=app.d.ts.map