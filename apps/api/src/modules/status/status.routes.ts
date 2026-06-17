/**
 * Platform-status router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/status`. Public (empty `roles`) and read-only.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './status.controller.js';

export function statusRouter(): Router {
  const router = Router();

  router.get('/', ...apiChain(), asyncHandler(controller.getStatus));

  return router;
}
