import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';
import { apiChain } from './api-chain.js';
/**
 * Trivial health/ping route used to prove the full middleware chain works
 * end-to-end. This is intentionally minimal — the real `/healthz` with live
 * PostgreSQL + Redis checks is task 1.5.
 *
 * The route runs slots 5–9 (via `apiChain`) followed by the handler (slot 10).
 * It is a read-only GET, so idempotency enforcement stays off.
 */
export function healthRouter() {
    const router = Router();
    const controller = new HealthController();
    router.get('/ping', ...apiChain(), controller.ping);
    // Operator dashboard readiness view — per-dependency PostgreSQL + Redis
    // status (same probe as the root /healthz). Operator-only.
    router.get('/full', ...apiChain({ roles: ['middleman'] }), controller.healthz);
    return router;
}
//# sourceMappingURL=health.routes.js.map