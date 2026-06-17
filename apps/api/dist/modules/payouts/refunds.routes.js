/**
 * Refunds operator router, intended to mount at `/api/v1/refunds`. Middleman-only
 * (slot 7 role guard); the assigned-middleman check is enforced in the service.
 * The process endpoint is money-moving, so it enforces an Idempotency-Key and
 * runs under `runMoneyWrite`.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './refunds.controller.js';
import { processRefundSchema } from './payouts.schemas.js';
export function refundsRouter() {
    const router = Router();
    // POST /api/v1/refunds/by-deal/:id/process — process a refund for a deal.
    router.post('/by-deal/:id/process', ...apiChain({
        schemas: { params: dealIdParamSchema, body: processRefundSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.process));
    return router;
}
//# sourceMappingURL=refunds.routes.js.map