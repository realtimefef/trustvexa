/**
 * Public contact-form router (task 8.3, Requirement 42.8), mounted at
 * `/api/v1/contact`.
 *
 * `POST /` is public (no role required) and runs the standard per-route chain
 * (validation -> jwt -> role guard -> rate limit -> idempotency) via
 * `apiChain`. The rate limiter throttles abuse of the open endpoint.
 */
import { Router } from 'express';
export declare function contactRouter(): Router;
//# sourceMappingURL=contact.routes.d.ts.map