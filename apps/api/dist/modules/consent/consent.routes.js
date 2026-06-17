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
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './consent.controller.js';
import { cookieConsentSchema } from './consent.schemas.js';
export function consentRouter() {
    const router = Router();
    router.post('/cookie', ...apiChain({ schemas: { body: cookieConsentSchema } }), asyncHandler(controller.recordConsent));
    return router;
}
//# sourceMappingURL=consent.routes.js.map