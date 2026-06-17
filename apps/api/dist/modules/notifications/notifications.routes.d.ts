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
export declare function notificationsRouter(): Router;
//# sourceMappingURL=notifications.routes.d.ts.map