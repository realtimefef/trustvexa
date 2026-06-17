/**
 * Deal-module runtime configuration (task 4.3).
 *
 * Loaded lazily and cached, mirroring auth.config.ts, so the HTTP server and
 * health probe can boot without invite secrets present; the first invite
 * request resolves and caches this. Secrets come from the environment (Render
 * secret store) and are never hardcoded.
 */
let cached = null;
function required(env, name) {
    const value = env[name];
    if (!value || value.trim() === '') {
        throw new Error(`${name} is not set (provided by the Render secret store).`);
    }
    return value;
}
function stripTrailingSlash(url) {
    return url.replace(/\/+$/, '');
}
export function loadDealConfig(env = process.env) {
    const inviteTokenHashKey = Buffer.from(required(env, 'INVITE_TOKEN_HASH_KEY'), 'base64');
    if (inviteTokenHashKey.length < 16) {
        throw new Error('INVITE_TOKEN_HASH_KEY must be at least 16 bytes (base64-encoded).');
    }
    const ttl = Number.parseInt(env.INVITE_TTL_HOURS ?? '72', 10);
    const codeTtl = Number.parseInt(env.VERIFICATION_CODE_TTL_MINUTES ?? '15', 10);
    const maxAttempts = Number.parseInt(env.MAX_VERIFICATION_ATTEMPTS ?? '5', 10);
    return {
        inviteTokenHashKey,
        webAppUrl: stripTrailingSlash(env.WEB_APP_URL ?? 'http://localhost:3000'),
        defaultInviteTtlHours: Number.isNaN(ttl) || ttl <= 0 ? 72 : ttl,
        verificationCodeTtlMinutes: Number.isNaN(codeTtl) || codeTtl <= 0 ? 15 : codeTtl,
        maxVerificationAttempts: Number.isNaN(maxAttempts) || maxAttempts <= 0 ? 5 : maxAttempts,
    };
}
export function getDealConfig() {
    if (cached === null) {
        cached = loadDealConfig();
    }
    return cached;
}
/** Test helper: reset the memoized config. */
export function resetDealConfigCache() {
    cached = null;
}
//# sourceMappingURL=deal.config.js.map