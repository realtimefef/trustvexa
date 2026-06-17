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
export declare function profileRouter(): Router;
//# sourceMappingURL=profile.routes.d.ts.map