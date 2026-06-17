/**
 * Announcements router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/announcements`.
 *
 * Both routes require an authenticated account (`user` | `middleman`). The list
 * is filtered to the caller's audience and carries their read state; marking an
 * announcement read enforces an Idempotency-Key at slot 9 and is idempotent.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './announcements.controller.js';
import { announcementIdParamSchema } from './announcements.schemas.js';

const ROLES: Array<'user' | 'middleman'> = ['user', 'middleman'];

export function announcementsRouter(): Router {
  const router = Router();

  router.get('/', ...apiChain({ roles: ROLES }), asyncHandler(controller.listAnnouncements));

  router.get(
    '/:id',
    ...apiChain({
      schemas: { params: announcementIdParamSchema },
      roles: ROLES,
    }),
    asyncHandler(controller.getAnnouncement),
  );

  router.post(
    '/:id/read',
    ...apiChain({
      schemas: { params: announcementIdParamSchema },
      roles: ROLES,
      enforceIdempotency: true,
    }),
    asyncHandler(controller.markRead),
  );

  return router;
}
