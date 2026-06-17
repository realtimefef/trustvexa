/**
 * Payouts operator router, intended to mount at `/api/v1/payouts`. All routes
 * are middleman-only (slot 7 role guard); the assigned-middleman check is
 * enforced in the service. The approve/broadcast endpoints are money/state
 * writes, so they enforce an Idempotency-Key and run under `runMoneyWrite`.
 */
import { Router } from 'express';
export declare function payoutsRouter(): Router;
//# sourceMappingURL=payouts.routes.d.ts.map