/**
 * Auth-specific runtime configuration (tasks 3.2, 3.4, 3.5).
 *
 * Loaded lazily so the HTTP server and health probe can boot without auth
 * secrets present; the first auth request resolves and caches this. Secrets
 * are read from the environment (Render secret store) and never hardcoded.
 */
export interface AuthConfig {
    readonly accessSecret: string;
    readonly refreshSecret: string;
    readonly accessTtl: string;
    readonly refreshTtl: string;
    readonly issuer: string;
    readonly audience: string;
    /** HMAC key for blind-index lookup hashes (e.g. email_hash). */
    readonly lookupHashKey: Buffer;
    readonly refreshCookieName: string;
    readonly cookieSecure: boolean;
    readonly breachCheckEnabled: boolean;
}
export declare function loadAuthConfig(env?: NodeJS.ProcessEnv): AuthConfig;
export declare function getAuthConfig(): AuthConfig;
/** Test helper: reset the memoized config. */
export declare function resetAuthConfigCache(): void;
//# sourceMappingURL=auth.config.d.ts.map