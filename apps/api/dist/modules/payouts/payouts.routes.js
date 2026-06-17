/**
 * Payouts operator router, intended to mount at `/api/v1/payouts`. All routes
 * are middleman-only (slot 7 role guard); the assigned-middleman check is
 * enforced in the service. The approve/broadcast endpoints are money/state
 * writes, so they enforce an Idempotency-Key and run under `runMoneyWrite`.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './payouts.controller.js';
import { payoutIdParamSchema } from './payouts.schemas.js';
export function payoutsRouter() {
    const router = Router();
    // GET /api/v1/payouts/queue — list pending/approved payouts (read-only, no
    // Idempotency-Key required).
    router.get('/queue', ...apiChain({ roles: ['middleman'] }), asyncHandler(controller.getQueue));
    // POST /api/v1/payouts/:payoutId/approve — first dual-control signature.
    router.post('/:payoutId/approve', ...apiChain({
        schemas: { params: payoutIdParamSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.approve));
    // POST /api/v1/payouts/:payoutId/broadcast — second dual-control signature.
    router.post('/:payoutId/broadcast', ...apiChain({
        schemas: { params: payoutIdParamSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.broadcast));
    return router;
}
//# sourceMappingURL=payouts.routes.js.map