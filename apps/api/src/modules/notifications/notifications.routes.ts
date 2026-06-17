/**
 * Notifications feature router, mounted by the parent at `/api/v1/notifications`.
 *
 * Every route requires an authenticated account (`user` or `middleman`); there
 * are no public notification routes. Ownership is enforced in the service from
 * the JWT user id, never from request input. State-mutating routes (mark read,
 * read-all, preference upsert, push subscribe) enforce an Idempotency-Key at
 * slot 9 so safe retries do not double-apply.
 *
 * Static paths are registered before the `/:id/read` param route so they are
 * matched unambiguously.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './notifications.controller.js';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  pushSubscribeSchema,
  upsertPreferenceSchema,
} from './notifications.schemas.js';

const ROLES: Array<'user' | 'middleman'> = ['user', 'middleman'];

export function notificationsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    ...apiChain({ schemas: { query: listNotificationsQuerySchema }, roles: ROLES }),
    asyncHandler(controller.listNotifications),
  );

  router.post(
    '/read-all',
    ...apiChain({ roles: ROLES, enforceIdempotency: true }),
    asyncHandler(controller.markAllRead),
  );

  router.get(
    '/preferences',
    ...apiChain({ roles: ROLES }),
    asyncHandler(controller.getPreferences),
  );

  router.put(
    '/preferences',
    ...apiChain({
      schemas: { body: upsertPreferenceSchema },
      roles: ROLES,
      enforceIdempotency: true,
    }),
    asyncHandler(controller.upsertPreference),
  );

  router.post(
    '/push/subscribe',
    ...apiChain({ schemas: { body: pushSubscribeSchema }, roles: ROLES, enforceIdempotency: true }),
    asyncHandler(controller.subscribePush),
  );

  router.patch(
    '/:id/read',
    ...apiChain({
      schemas: { params: notificationIdParamSchema },
      roles: ROLES,
      enforceIdempotency: true,
    }),
    asyncHandler(controller.markRead),
  );

  return router;
}
