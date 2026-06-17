/**
 * Public contact-form router (task 8.3, Requirement 42.8), mounted at
 * `/api/v1/contact`.
 *
 * `POST /` is public (no role required) and runs the standard per-route chain
 * (validation -> jwt -> role guard -> rate limit -> idempotency) via
 * `apiChain`. The rate limiter throttles abuse of the open endpoint.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './contact.controller.js';
import { contactMessageSchema } from './contact.schemas.js';

export function contactRouter(): Router {
  const router = Router();

  router.post(
    '/',
    ...apiChain({ schemas: { body: contactMessageSchema } }),
    asyncHandler(controller.submit),
  );

  return router;
}
