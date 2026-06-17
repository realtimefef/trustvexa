import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ErrorEnvelope } from '@trustvexa/shared';

import { AppError, notFound } from '../errors/app-error.js';

/**
 * Terminal 404 handler — runs after the router when no route matched. Forwards
 * a structured `not_found` error into the centralized error handler so the
 * response still uses the standard envelope.
 */
export function notFoundHandler(): RequestHandler {
  return (_req, _res, next) => {
    next(notFound());
  };
}

/**
 * Middleware slot 11 — Centralized error handler.
 *
 * Converts any error into the standard envelope `{ error_code, message,
 * request_id }`, logs it with the request id, and never leaks internals for
 * unexpected errors. (Requirements 44.3 slot 11, 44.4)
 *
 * NOTE: the unused `_next` parameter is required — Express identifies error
 * handlers by their 4-argument arity.
 */
export function errorHandler(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const requestId = req.requestId ?? 'unknown';

    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const errorCode = isAppError ? err.errorCode : 'internal_error';
    const message = isAppError
      ? err.message
      : 'An unexpected error occurred while processing the request.';

    // Log with the request id; unexpected errors include the stack.
    req.log?.error(
      { err, request_id: requestId, error_code: errorCode, status_code: statusCode },
      'request_failed',
    );

    const envelope: ErrorEnvelope = {
      error_code: errorCode,
      message,
      request_id: requestId,
    };

    res.status(statusCode).json(envelope);
  };
}
