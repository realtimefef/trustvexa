/**
 * Cookie-consent router (task 8.3, Requirement 42.8), mounted at
 * `/api/v1/consent`.
 *
 * `POST /cookie` is public (no role required) so anonymous visitors can record
 * their choice. It runs the standard per-route chain (validation -> jwt ->
 * role guard -> rate limit -> idempotency) via `apiChain`; the jwt slot still
 * populates `req.auth` for signed-in users so their consent is attributed.
 */
import { Router } from 'express';
export declare function consentRouter(): Router;
//# sourceMappingURL=consent.routes.d.ts.map