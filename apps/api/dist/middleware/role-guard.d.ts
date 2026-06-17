import type { RequestHandler } from 'express';
/**
 * Middleware slot 7 — Role guard (task 3.5).
 *
 * Enforces server-side role authorization against the role carried by the
 * verified access token (never a client-presented claim). An empty
 * `allowedRoles` marks the route public. Otherwise an unauthenticated request
 * is rejected 401 and a wrong-role request 403. Per-deal ownership checks are
 * enforced deeper, at the repository access guard. (Requirements 3.9, 44.5)
 */
export declare function roleGuard(allowedRoles?: Array<'user' | 'middleman'>): RequestHandler;
//# sourceMappingURL=role-guard.d.ts.map