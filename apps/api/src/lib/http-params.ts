/**
 * Typed accessors for request-scoped values that the middleware chain
 * guarantees are present by the time a controller runs, but which TypeScript
 * still widens to `string | undefined` under `noUncheckedIndexedAccess`.
 *
 * Path params are Zod-validated in slot 5 of the chain, so a missing value here
 * means a route was wired without its schema — a programming error surfaced as
 * a 400 rather than an untyped `undefined` flowing into the service layer.
 */
import type { Request } from 'express';

import { AppError } from '../errors/app-error.js';

/** Return a required path parameter, or throw a 400 when it is absent. */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (value === undefined || value === '') {
    throw new AppError(
      'missing_path_parameter',
      `Required path parameter '${name}' is missing.`,
      400,
    );
  }
  return value;
}

/** Return the authenticated user id set by the JWT auth middleware, or throw 401. */
export function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(
      'unauthenticated',
      'Authenticated user id missing after auth middleware.',
      401,
    );
  }
  return userId;
}
