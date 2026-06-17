/**
 * Public feature router (task 8.2), mounted at `/api/v1/public`. All routes are
 * unauthenticated (empty `roles` => public) and read-only.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './public.controller.js';

export function publicRouter(): Router {
  const router = Router();

  // GET /api/v1/public/policy-versions — current published legal versions.
  router.get('/policy-versions', ...apiChain(), asyncHandler(controller.getPolicyVersions));

  // GET /api/v1/public/avatar/:userId — user avatar streaming.
  router.get('/avatar/:userId', ...apiChain(), asyncHandler(controller.streamAvatar));

  // GET /api/v1/public/service-hours — middleman availability.
  router.get('/service-hours', ...apiChain(), asyncHandler(controller.getServiceHours));

  return router;
}
