/**
 * Refunds operator router, intended to mount at `/api/v1/refunds`. Middleman-only
 * (slot 7 role guard); the assigned-middleman check is enforced in the service.
 * The process endpoint is money-moving, so it enforces an Idempotency-Key and
 * runs under `runMoneyWrite`.
 */
import { Router } from 'express';
export declare function refundsRouter(): Router;
//# sourceMappingURL=refunds.routes.d.ts.map