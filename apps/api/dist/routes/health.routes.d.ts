import { Router } from 'express';
/**
 * Trivial health/ping route used to prove the full middleware chain works
 * end-to-end. This is intentionally minimal — the real `/healthz` with live
 * PostgreSQL + Redis checks is task 1.5.
 *
 * The route runs slots 5–9 (via `apiChain`) followed by the handler (slot 10).
 * It is a read-only GET, so idempotency enforcement stays off.
 */
export declare function healthRouter(): Router;
//# sourceMappingURL=health.routes.d.ts.map