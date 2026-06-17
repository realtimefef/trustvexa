/**
 * Announcements router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/announcements`.
 *
 * Both routes require an authenticated account (`user` | `middleman`). The list
 * is filtered to the caller's audience and carries their read state; marking an
 * announcement read enforces an Idempotency-Key at slot 9 and is idempotent.
 */
import { Router } from 'express';
export declare function announcementsRouter(): Router;
//# sourceMappingURL=announcements.routes.d.ts.map