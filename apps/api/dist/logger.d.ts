/**
 * Base structured logger for the API service, built on the shared logger so api
 * and worker emit consistent structured JSON. The per-request child logger
 * carrying the request id is created by the request-context middleware
 * (pino-http) and attached to `req.log`, so every log line within a request —
 * and the error envelope's `request_id` — is correlated by that id.
 * (Requirements 44.3, 44.4)
 */
export declare const logger: import("pino").Logger;
//# sourceMappingURL=logger.d.ts.map