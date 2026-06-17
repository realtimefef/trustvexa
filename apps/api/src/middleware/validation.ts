import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

import { AppError } from '../errors/app-error.js';

/**
 * Middleware slot 5 — Zod validation.
 *
 * Validates `body`, `query`, and/or `params` against the provided Zod schemas,
 * using the same schema definitions shared with the client via
 * `@trustvexa/shared` so both sides validate identically. On failure it raises
 * an `AppError` that the centralized error handler renders as the standard
 * envelope. (Requirements 44.3 slot 5, 44.4)
 */
export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // req.query is read-only in some express versions; assign defensively.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (_err) {
      // Log internally for observability — never send schema details to the client.
      req.log?.debug({ err: _err }, 'request validation failed');
      next(new AppError('validation_error', 'Request validation failed.', 422));
    }
  };
}
