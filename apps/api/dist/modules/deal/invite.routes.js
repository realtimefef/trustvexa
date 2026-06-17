/**
 * Invite router (task 4.3), mounted at `/api/v1/invites`. Deal-scoped invite
 * creation/listing lives on the deal router (`/deals/:id/invites`).
 *
 * Token actions (preview/accept) take the token in the POST body, never the
 * URL, so it stays out of access logs. Accept is state-changing and enforces an
 * Idempotency-Key.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './invite.controller.js';
import { inviteIdParamSchema, inviteTokenSchema, revokeInviteSchema } from './invite.schemas.js';
const ACCOUNT_ROLES = ['user', 'middleman'];
export function inviteRouter() {
    const router = Router();
    router.post('/preview', ...apiChain({ schemas: { body: inviteTokenSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.previewInvite));
    router.post('/accept', ...apiChain({
        schemas: { body: inviteTokenSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.acceptInvite));
    router.post('/:id/revoke', ...apiChain({
        schemas: { params: inviteIdParamSchema, body: revokeInviteSchema },
        roles: [...ACCOUNT_ROLES],
    }), asyncHandler(controller.revokeInvite));
    return router;
}
//# sourceMappingURL=invite.routes.js.map