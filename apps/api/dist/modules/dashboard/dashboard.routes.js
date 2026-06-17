/**
 * Dashboard feature router (task 7.1), mounted at `/api/v1/dashboard`.
 *
 * Read-only views over the deals a user is a party to. Every route runs the
 * fixed per-route chain (validation -> jwt -> role guard -> rate limit ->
 * idempotency) via `apiChain`; these are reads, so no Idempotency-Key is
 * enforced. Both `user` and `middleman` accounts may call them — the service
 * derives the caller's role per deal and filters accordingly.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './dashboard.controller.js';
const ACCOUNT_ROLES = ['user', 'middleman'];
export function dashboardRouter() {
    const router = Router();
    // GET /api/v1/dashboard — every deal the user is a party to, each with its
    // role-specific next actions and a waiting-on-you flag.
    router.get('/', ...apiChain({ roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.getDashboard));
    // GET /api/v1/dashboard/deals/:id — full snapshot + role-filtered timeline.
    router.get('/deals/:id', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.getDealDetail));
    return router;
}
//# sourceMappingURL=dashboard.routes.js.map