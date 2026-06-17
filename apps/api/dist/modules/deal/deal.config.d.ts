/**
 * Deal-module runtime configuration (task 4.3).
 *
 * Loaded lazily and cached, mirroring auth.config.ts, so the HTTP server and
 * health probe can boot without invite secrets present; the first invite
 * request resolves and caches this. Secrets come from the environment (Render
 * secret store) and are never hardcoded.
 */
export interface DealConfig {
    /** HMAC key used to hash invite tokens for blind-index storage. */
    readonly inviteTokenHashKey: Buffer;
    /** Public web-app base URL used to build shareable invite links. */
    readonly webAppUrl: string;
    /** Default invite lifetime in hours when the caller does not specify one. */
    readonly defaultInviteTtlHours: number;
    /** Lifetime of a 48-digit verification code, in minutes. */
    readonly verificationCodeTtlMinutes: number;
    /** Max verification-code submission attempts before a new code is required. */
    readonly maxVerificationAttempts: number;
}
export declare function loadDealConfig(env?: NodeJS.ProcessEnv): DealConfig;
export declare function getDealConfig(): DealConfig;
/** Test helper: reset the memoized config. */
export declare function resetDealConfigCache(): void;
//# sourceMappingURL=deal.config.d.ts.map