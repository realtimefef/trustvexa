/**
 * Google OAuth login — pure core (task 3.3, Requirement 2.2).
 *
 * All CSRF-state signing, authorization-URL building, and account-link decision
 * logic lives here so it is unit-testable with no network. The network calls
 * (code->token exchange, userinfo fetch) and DB writes live in
 * google-oauth.service.ts. No secret VALUES are logged.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
export const GOOGLE_SCOPES = ['openid', 'email', 'profile'] as const;

/** Default lifetime of a signed OAuth state token (10 minutes). */
export const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export interface GoogleOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  /** HMAC key used to sign the anti-CSRF state token. */
  readonly stateSecret: Buffer;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not set (provided by the Render secret store).`);
  }
  return value;
}

/**
 * Load Google OAuth config from the environment. The redirect URI defaults to
 * `${WEB_APP_URL}/api/v1/auth/google/callback` but can be overridden.
 */
export function loadGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig {
  const clientId = required(env, 'GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = required(env, 'GOOGLE_OAUTH_CLIENT_SECRET');
  const redirectUri =
    env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${required(env, 'WEB_APP_URL').replace(/\/$/, '')}/api/v1/auth/google/callback`;
  const stateSecret = Buffer.from(required(env, 'AUTH_LOOKUP_HASH_KEY'), 'base64');
  if (stateSecret.length < 16) {
    throw new Error('AUTH_LOOKUP_HASH_KEY must be at least 16 bytes (base64-encoded).');
  }
  return { clientId, clientSecret, redirectUri, stateSecret };
}

export interface OAuthStatePayload {
  nonce: string;
  issuedAt: number;
  returnTo?: string;
}

/** Create a fresh state payload with a random nonce. */
export function newOAuthState(returnTo?: string): OAuthStatePayload {
  return returnTo === undefined
    ? { nonce: randomUUID(), issuedAt: Date.now() }
    : { nonce: randomUUID(), issuedAt: Date.now(), returnTo };
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** Sign a state payload as `<base64url(json)>.<hmac>` (tamper-evident). */
export function signState(payload: OAuthStatePayload, secret: Buffer): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * Verify and decode a signed state token. Throws on a malformed token, a
 * signature mismatch, or an expired state. Constant-time signature compare.
 */
export function verifyState(
  token: string,
  secret: Buffer,
  maxAgeMs: number = STATE_MAX_AGE_MS,
  now: number = Date.now(),
): OAuthStatePayload {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) {
    throw new Error('Malformed OAuth state token.');
  }
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('OAuth state signature mismatch (possible CSRF).');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
  if (typeof payload.issuedAt !== 'number' || now - payload.issuedAt > maxAgeMs) {
    throw new Error('OAuth state expired.');
  }
  return payload;
}

/** Build the Google authorization URL the browser is redirected to. */
export function buildAuthorizationUrl(cfg: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    state,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/** Normalize the raw userinfo JSON from Google into a typed profile. */
export function parseGoogleProfile(raw: Readonly<Record<string, unknown>>): GoogleProfile {
  const sub = raw['sub'];
  const email = raw['email'];
  if (typeof sub !== 'string' || sub === '') throw new Error('Google profile missing sub.');
  if (typeof email !== 'string' || email === '') throw new Error('Google profile missing email.');
  const profile: GoogleProfile = {
    sub,
    email: email.trim().toLowerCase(),
    emailVerified: raw['email_verified'] === true || raw['email_verified'] === 'true',
  };
  if (typeof raw['name'] === 'string') profile.name = raw['name'];
  if (typeof raw['picture'] === 'string') profile.picture = raw['picture'];
  return profile;
}

/** Result of looking up whether a Google identity / email already exists. */
export interface LinkLookup {
  /** userId already linked to this Google `sub`, else null. */
  byGoogleSub: string | null;
  /** userId owning this verified email (for linking), else null. */
  byEmailHash: string | null;
}

export type AccountLinkDecision =
  | { action: 'login'; userId: string }
  | { action: 'link'; userId: string }
  | { action: 'create' }
  | { action: 'reject'; reason: string };

/**
 * Decide what to do with a verified Google profile:
 * - unverified Google email        -> reject (never trust an unverified email)
 * - Google sub already linked       -> login that user
 * - email already owned by a user   -> link Google to that existing account
 * - otherwise                       -> create a new account
 */
export function resolveAccountLink(
  profile: GoogleProfile,
  lookup: LinkLookup,
): AccountLinkDecision {
  if (!profile.emailVerified) {
    return { action: 'reject', reason: 'google_email_unverified' };
  }
  if (lookup.byGoogleSub) {
    return { action: 'login', userId: lookup.byGoogleSub };
  }
  if (lookup.byEmailHash) {
    return { action: 'link', userId: lookup.byEmailHash };
  }
  return { action: 'create' };
}
