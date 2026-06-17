import cors from 'cors';
import { config } from '../config/env.js';
/**
 * Middleware slot 2 — CORS.
 *
 * Allows the configured frontend origins (from `CORS_ORIGINS`) to call the API
 * with credentials (the refresh-token cookie). When no origins are configured
 * (local scaffold), requests with no Origin header (same-origin, curl) are
 * permitted and cross-origin browser requests are rejected. (Requirement 44.3
 * slot 2)
 */
export function corsMiddleware() {
    const allowList = config.corsOrigins;
    return cors({
        origin(origin, callback) {
            // Non-browser or same-origin requests have no Origin header.
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowList.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
        exposedHeaders: ['X-Request-Id'],
    });
}
//# sourceMappingURL=cors.js.map