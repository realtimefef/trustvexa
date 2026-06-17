import type { RequestHandler } from 'express';
/**
 * Middleware slot 9 — Idempotency-Key presence check (task 5.11).
 *
 * Records a present `Idempotency-Key` header onto `req.idempotencyKey`. When
 * `enforce` is true (money/state-changing routes), a missing or blank key is
 * rejected with `idempotency_key_required` (Requirement 17.13).
 *
 * The replay/serialization contract itself — claiming the key, returning the
 * original result for a repeat, and rejecting reuse with a different payload —
 * lives in `runMoneyWrite` (`modules/money/money-write.ts`), because it must run
 * inside the same database transaction as the money mutation (Req 17.14).
 */
export declare function idempotencyKey(enforce?: boolean): RequestHandler;
//# sourceMappingURL=idempotency.d.ts.map