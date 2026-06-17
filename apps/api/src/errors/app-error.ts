/**
 * Application error carrying a machine-readable `error_code` and HTTP status.
 *
 * The centralized error handler converts any thrown `AppError` into the
 * standard envelope `{ error_code, message, request_id }`. (Requirement 44.4)
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;

  constructor(errorCode: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Convenience factory for 404 responses. */
export function notFound(message = 'Resource not found'): AppError {
  return new AppError('not_found', message, 404);
}

/** Convenience factory for missing-idempotency-key rejections. (Requirement 17.13) */
export function idempotencyKeyRequired(): AppError {
  return new AppError(
    'idempotency_key_required',
    'An Idempotency-Key header is required for this request.',
    400,
  );
}
