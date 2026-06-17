/**
 * Application error carrying a machine-readable `error_code` and HTTP status.
 *
 * The centralized error handler converts any thrown `AppError` into the
 * standard envelope `{ error_code, message, request_id }`. (Requirement 44.4)
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    constructor(errorCode: string, message: string, statusCode?: number);
}
/** Convenience factory for 404 responses. */
export declare function notFound(message?: string): AppError;
/** Convenience factory for missing-idempotency-key rejections. (Requirement 17.13) */
export declare function idempotencyKeyRequired(): AppError;
//# sourceMappingURL=app-error.d.ts.map