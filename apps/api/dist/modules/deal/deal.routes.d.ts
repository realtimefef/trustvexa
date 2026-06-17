/**
 * Deal feature router (tasks 4.1, 4.3, 4.5, 4.7, 4.8), mounted at
 * `/api/v1/deals`.
 *
 * Every route runs the fixed per-route chain (validation -> jwt -> role guard
 * -> rate limit -> idempotency) via `apiChain`. All routes require an
 * authenticated account. Routes that change state enforce an Idempotency-Key
 * (Requirement 17.13); read-only routes do not. Literal `/drafts` routes are
 * registered before the `/:id` param route so they match first.
 */
import { Router } from 'express';
export declare function dealRouter(): Router;
//# sourceMappingURL=deal.routes.d.ts.map