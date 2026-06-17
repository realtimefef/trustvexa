export declare const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export declare const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export declare const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
export declare const GOOGLE_SCOPES: readonly ["openid", "email", "profile"];
/** Default lifetime of a signed OAuth state token (10 minutes). */
export declare const STATE_MAX_AGE_MS: number;
export interface GoogleOAuthConfig {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly redirectUri: string;
    /** HMAC key used to sign the anti-CSRF state token. */
    readonly stateSecret: Buffer;
}
/**
 * Load Google OAuth config from the environment. The redirect URI defaults to
 * `${WEB_APP_URL}/api/v1/auth/google/callback` but can be overridden.
 */
export declare function loadGoogleOAuthConfig(env?: NodeJS.ProcessEnv): GoogleOAuthConfig;
export interface OAuthStatePayload {
    nonce: string;
    issuedAt: number;
    returnTo?: string;
}
/** Create a fresh state payload with a random nonce. */
export declare function newOAuthState(returnTo?: string): OAuthStatePayload;
/** Sign a state payload as `<base64url(json)>.<hmac>` (tamper-evident). */
export declare function signState(payload: OAuthStatePayload, secret: Buffer): string;
/**
 * Verify and decode a signed state token. Throws on a malformed token, a
 * signature mismatch, or an expired state. Constant-time signature compare.
 */
export declare function verifyState(token: string, secret: Buffer, maxAgeMs?: number, now?: number): OAuthStatePayload;
/** Build the Google authorization URL the browser is redirected to. */
export declare function buildAuthorizationUrl(cfg: GoogleOAuthConfig, state: string): string;
export interface GoogleProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
}
/** Normalize the raw userinfo JSON from Google into a typed profile. */
export declare function parseGoogleProfile(raw: Readonly<Record<string, unknown>>): GoogleProfile;
/** Result of looking up whether a Google identity / email already exists. */
export interface LinkLookup {
    /** userId already linked to this Google `sub`, else null. */
    byGoogleSub: string | null;
    /** userId owning this verified email (for linking), else null. */
    byEmailHash: string | null;
}
export type AccountLinkDecision = {
    action: 'login';
    userId: string;
} | {
    action: 'link';
    userId: string;
} | {
    action: 'create';
} | {
    action: 'reject';
    reason: string;
};
/**
 * Decide what to do with a verified Google profile:
 * - unverified Google email        -> reject (never trust an unverified email)
 * - Google sub already linked       -> login that user
 * - email already owned by a user   -> link Google to that existing account
 * - otherwise                       -> create a new account
 */
export declare function resolveAccountLink(profile: GoogleProfile, lookup: LinkLookup): AccountLinkDecision;
//# sourceMappingURL=google-oauth.d.ts.map