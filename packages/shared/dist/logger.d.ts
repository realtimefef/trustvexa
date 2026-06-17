import type { Logger } from 'pino';
export type { Logger } from 'pino';
/** The canonical correlation-id header used across services. */
export declare const REQUEST_ID_HEADER = "x-request-id";
/** The structured field name carrying the correlation id on every log line. */
export declare const REQUEST_ID_FIELD = "request_id";
export interface CreateLoggerOptions {
    /** Stable service name stamped on every log line (e.g. `@trustvexa/api`). */
    readonly service: string;
    /** Log level. Defaults to `LOG_LEVEL`, else `info` in prod / `debug` otherwise. */
    readonly level?: string;
    /** Extra stable base fields merged into every log line. */
    readonly base?: Record<string, unknown>;
}
/**
 * Create a base structured logger for a service. The default level honors
 * `LOG_LEVEL`, falling back to `info` in production and `debug` elsewhere.
 */
export declare function createLogger(options: CreateLoggerOptions): Logger;
/**
 * Derive a child logger that stamps `request_id` (the correlation id) onto
 * every line, so a request or background job can be traced end-to-end.
 */
export declare function withRequestId(logger: Logger, requestId: string): Logger;
//# sourceMappingURL=logger.d.ts.map