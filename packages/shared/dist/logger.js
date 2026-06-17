/**
 * Shared structured logger (pino).
 *
 * Node-only subpath module (`@trustvexa/shared/logger`) so `@trustvexa/api` and
 * `@trustvexa/worker` emit consistent, structured JSON logs that carry a
 * request/correlation id end-to-end. *(Requirements 44.4)*
 *
 * This module is intentionally NOT re-exported from the browser barrel
 * (`@trustvexa/shared` / `@trustvexa/shared/client`) so pino never leaks into
 * the frontend bundle. Each service creates its own base logger with a stable
 * `service` field, then derives per-request/per-job child loggers that stamp
 * `request_id` onto every line so logs correlate across services.
 */
import { pino } from 'pino';
/** The canonical correlation-id header used across services. */
export const REQUEST_ID_HEADER = 'x-request-id';
/** The structured field name carrying the correlation id on every log line. */
export const REQUEST_ID_FIELD = 'request_id';
/**
 * Create a base structured logger for a service. The default level honors
 * `LOG_LEVEL`, falling back to `info` in production and `debug` elsewhere.
 */
export function createLogger(options) {
    const defaultLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
    return pino({
        level: options.level ?? process.env.LOG_LEVEL ?? defaultLevel,
        base: { service: options.service, ...options.base },
    });
}
/**
 * Derive a child logger that stamps `request_id` (the correlation id) onto
 * every line, so a request or background job can be traced end-to-end.
 */
export function withRequestId(logger, requestId) {
    return logger.child({ [REQUEST_ID_FIELD]: requestId });
}
//# sourceMappingURL=logger.js.map