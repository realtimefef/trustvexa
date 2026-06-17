/**
 * Environment configuration for the API service.
 *
 * Scaffold-only: only the values needed to boot the HTTP server and the
 * middleware stack are read here. Secrets for JWT, DB, and Redis are wired in
 * later tasks (3.x, 1.5) and documented in the root `.env.example`.
 */
function parseOrigins(raw) {
    if (!raw) {
        return [];
    }
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}
export function loadConfig() {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const port = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? '3001', 10);
    return {
        nodeEnv,
        port: Number.isNaN(port) ? 3001 : port,
        corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
        isProduction: nodeEnv === 'production',
    };
}
export const config = loadConfig();
//# sourceMappingURL=env.js.map