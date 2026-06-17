import type { ErrorRequestHandler, RequestHandler } from 'express';
/**
 * Terminal 404 handler — runs after the router when no route matched. Forwards
 * a structured `not_found` error into the centralized error handler so the
 * response still uses the standard envelope.
 */
export declare function notFoundHandler(): RequestHandler;
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
export declare function errorHandler(): ErrorRequestHandler;
//# sourceMappingURL=error-handler.d.ts.map