import type { RequestHandler } from 'express';
import { type ValidationSchemas } from '../middleware/validation.js';
/**
 * Composes the per-route portion of the fixed middleware stack in its exact,
 * normative order (Requirement 44.3):
 *
 *   5. Zod validation
 *   6. JWT auth        (verify Bearer access token, jti denylist)
 *   7. Role guard      (server-side role authorization)
 *   8. Rate limiter    (Redis fixed-window, RateLimit-* headers, 429)
 *   9. Idempotency-Key (presence enforced; replay via runMoneyWrite)
 *
 * Slots 1–4 (security headers -> CORS -> request id + logging -> body parse)
 * are applied globally on the app before the router. Slot 10 (handler) is the
 * route's controller, and slot 11 (centralized error handler) is registered
 * after the router. Keeping this single composer guarantees every route enters
 * the chain in the same order.
 */
export interface ApiChainOptions {
    /** Zod schemas for slot 5. Omit for routes with no input to validate. */
    schemas?: ValidationSchemas;
    /** Roles required by slot 7. Empty means no role requirement (public). */
    roles?: Array<'user' | 'middleman'>;
    /** Whether slot 9 must enforce an Idempotency-Key (money/state routes). */
    enforceIdempotency?: boolean;
    /** Custom rate limiting options for slot 8. */
    rateLimit?: {
        windowSeconds: number;
        max: number;
        failClosed?: boolean;
    };
}
export declare function apiChain(options?: ApiChainOptions): RequestHandler[];
//# sourceMappingURL=api-chain.d.ts.map