/**
 * Changelog router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/changelog`. Public (empty `roles`) and read-only.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './changelog.controller.js';

export function changelogRouter(): Router {
  const router = Router();

  router.get('/', ...apiChain(), asyncHandler(controller.listChangelog));

  return router;
}
