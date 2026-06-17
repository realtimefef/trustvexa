import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
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
export declare function validate(schemas: ValidationSchemas): RequestHandler;
//# sourceMappingURL=validation.d.ts.map