import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';

/**
 * Middleware slot 7 — Role guard (task 3.5).
 *
 * Enforces server-side role authorization against the role carried by the
 * verified access token (never a client-presented claim). An empty
 * `allowedRoles` marks the route public. Otherwise an unauthenticated request
 * is rejected 401 and a wrong-role request 403. Per-deal ownership checks are
 * enforced deeper, at the repository access guard. (Requirements 3.9, 44.5)
 */
export function roleGuard(allowedRoles: Array<'user' | 'middleman'> = []): RequestHandler {
  return (req, _res, next) => {
    if (allowedRoles.length === 0) {
      next();
      return;
    }
    const auth = req.auth;
    if (!auth || !auth.userId) {
      next(new AppError('unauthorized', 'Authentication is required for this resource.', 401));
      return;
    }
    if (!auth.role || !allowedRoles.includes(auth.role)) {
      next(new AppError('forbidden', 'You do not have access to this resource.', 403));
      return;
    }
    next();
  };
}
