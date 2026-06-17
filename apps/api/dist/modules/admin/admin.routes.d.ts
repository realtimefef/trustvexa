/**
 * Middleman/admin console router (task 7.2), mounted at `/api/v1/admin`.
 *
 * Read-only triage views over the deals a middleman is assigned to. Every route
 * runs the fixed per-route chain via `apiChain` and is restricted to the
 * `middleman` role; these are reads, so no Idempotency-Key is enforced.
 */
import { Router } from 'express';
export declare function adminRouter(): Router;
//# sourceMappingURL=admin.routes.d.ts.map