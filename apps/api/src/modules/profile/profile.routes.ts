/**
 * Authenticated profile feature router, intended to mount at `/api/v1/me`.
 *
 *   GET   /me              — the caller's own profile
 *   GET   /me/preferences  — read the caller's preferences
 *   PATCH /me/preferences  — idempotent partial upsert of the caller's preferences
 *
 * Every route is restricted to signed-in accounts and is scoped to the JWT user
 * id in the controller, so no caller can address another user's data.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './profile.controller.js';
import { updatePreferencesSchema, updateProfileSchema } from './profile.schemas.js';
import { accountActionSchema } from '../auth/auth.schemas.js';

export function profileRouter(): Router {
  const router = Router();

  router.get('/', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.getMe));

  router.patch(
    '/',
    ...apiChain({ schemas: { body: updateProfileSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.updateProfile),
  );

  router.get(
    '/preferences',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.getPreferences),
  );

  router.patch(
    '/preferences',
    ...apiChain({ schemas: { body: updatePreferencesSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.updatePreferences),
  );

  router.delete(
    '/sessions',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.revokeSessions),
  );

  router.post(
    '/avatar',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.uploadAvatar),
  );

  router.post(
    '/delete',
    ...apiChain({ schemas: { body: accountActionSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.deleteMe),
  );

  return router;
}
