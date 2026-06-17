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

let cached: DealConfig | null = null;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is not set (provided by the Render secret store).`);
  }
  return value;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function loadDealConfig(env: NodeJS.ProcessEnv = process.env): DealConfig {
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

export function getDealConfig(): DealConfig {
  if (cached === null) {
    cached = loadDealConfig();
  }
  return cached;
}

/** Test helper: reset the memoized config. */
export function resetDealConfigCache(): void {
  cached = null;
}
