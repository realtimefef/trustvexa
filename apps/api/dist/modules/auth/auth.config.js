/**
 * Auth-specific runtime configuration (tasks 3.2, 3.4, 3.5).
 *
 * Loaded lazily so the HTTP server and health probe can boot without auth
 * secrets present; the first auth request resolves and caches this. Secrets
 * are read from the environment (Render secret store) and never hardcoded.
 */
let cached = null;
function required(env, name) {
    const value = env[name];
    if (!value || value.trim() === '') {
        throw new Error(`${name} is not set (provided by the Render secret store).`);
    }
    return value;
}
export function loadAuthConfig(env = process.env) {
    const accessSecret = required(env, 'JWT_ACCESS_SECRET');
    const refreshSecret = required(env, 'JWT_REFRESH_SECRET');
    if (accessSecret === refreshSecret) {
        throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
    }
    const lookupHashKey = Buffer.from(required(env, 'AUTH_LOOKUP_HASH_KEY'), 'base64');
    if (lookupHashKey.length < 16) {
        throw new Error('AUTH_LOOKUP_HASH_KEY must be at least 16 bytes (base64-encoded).');
    }
    return {
        accessSecret,
        refreshSecret,
        accessTtl: env.JWT_ACCESS_TTL ?? '15m',
        refreshTtl: env.JWT_REFRESH_TTL ?? '30d',
        issuer: env.JWT_ISSUER ?? 'trustvexa',
        audience: env.JWT_AUDIENCE ?? 'trustvexa-app',
        lookupHashKey,
        refreshCookieName: env.REFRESH_COOKIE_NAME ?? 'tv_refresh',
        cookieSecure: (env.NODE_ENV ?? 'development') === 'production',
        breachCheckEnabled: env.AUTH_DISABLE_BREACH_CHECK !== 'true',
    };
}
export function getAuthConfig() {
    if (cached === null) {
        cached = loadAuthConfig();
    }
    return cached;
}
/** Test helper: reset the memoized config. */
export function resetAuthConfigCache() {
    cached = null;
}
//# sourceMappingURL=auth.config.js.map