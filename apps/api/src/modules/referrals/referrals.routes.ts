/**
 * Referral program router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/referrals`.
 *
 * Both routes require an authenticated account (`user` | `middleman`) and the
 * service scopes everything to the JWT user id. Creating/getting the caller's
 * code enforces an Idempotency-Key at slot 9 and is idempotent (get-or-create).
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './referrals.controller.js';

const ROLES: Array<'user' | 'middleman'> = ['user', 'middleman'];

export function referralsRouter(): Router {
  const router = Router();

  router.get('/', ...apiChain({ roles: ROLES }), asyncHandler(controller.listReferrals));

  router.post(
    '/',
    ...apiChain({ roles: ROLES, enforceIdempotency: true }),
    asyncHandler(controller.createCode),
  );

  return router;
}
