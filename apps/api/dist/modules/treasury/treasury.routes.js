/**
 * Treasury feature router (task 7.4), mounted at `/api/v1/treasury`. Read-only,
 * `middleman`-only views over reconciliation snapshots; no Idempotency-Key is
 * enforced because there are no writes.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './treasury.controller.js';
export function treasuryRouter() {
    const router = Router();
    // GET /api/v1/treasury — latest reconciliation snapshot per coin/network.
    router.get('/', ...apiChain({ roles: ['middleman'] }), asyncHandler(controller.getTreasury));
    return router;
}
//# sourceMappingURL=treasury.routes.js.map