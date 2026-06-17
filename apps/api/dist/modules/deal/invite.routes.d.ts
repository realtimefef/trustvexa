/**
 * Invite router (task 4.3), mounted at `/api/v1/invites`. Deal-scoped invite
 * creation/listing lives on the deal router (`/deals/:id/invites`).
 *
 * Token actions (preview/accept) take the token in the POST body, never the
 * URL, so it stays out of access logs. Accept is state-changing and enforces an
 * Idempotency-Key.
 */
import { Router } from 'express';
export declare function inviteRouter(): Router;
//# sourceMappingURL=invite.routes.d.ts.map