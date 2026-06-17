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
export declare function dashboardRouter(): Router;
//# sourceMappingURL=dashboard.routes.d.ts.map