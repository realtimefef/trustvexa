// Configuration / secrets validation layer (task 9.7, Requirements 41.1-41.3).
// Pure: validates the runtime environment and reports missing required keys.
// No secret VALUES are logged; only key presence is reported.

export interface EnvSpec {
  key: string;
  /** Required for real-money (mainnet) operation. */
  requiredForMainnet: boolean;
  description: string;
  /**
   * Tier of the requirement for mainnet:
   *  - 'critical'    : fund-safety / core operation. Missing => REFUSE to boot.
   *  - 'recommended' : feature service (email, uploads, social login). Missing
   *                    => boot with a warning; the feature degrades until set.
   * Only meaningful when `requiredForMainnet` is true.
   */
  tier?: 'critical' | 'recommended';
}

export const ENV_SPECS: readonly EnvSpec[] = [
  // ── Critical: fund-safety + core escrow operation (boot-blocking) ──────────
  { key: 'DATABASE_URL', requiredForMainnet: true, tier: 'critical', description: 'PostgreSQL connection string' },
  { key: 'REDIS_URL', requiredForMainnet: true, tier: 'critical', description: 'Redis connection string' },
  {
    key: 'JWT_ACCESS_SECRET',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Access token signing secret',
  },
  {
    key: 'JWT_REFRESH_SECRET',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Refresh token signing secret',
  },
  {
    key: 'AUTH_LOOKUP_HASH_KEY',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Deterministic auth lookup key',
  },
  {
    key: 'ENCRYPTION_MASTER_KEY',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Field-encryption master key',
  },
  { key: 'TRUSTVEXA_MASTER_KEK', requiredForMainnet: true, tier: 'critical', description: 'Key-encryption key' },
  { key: 'INVITE_TOKEN_HASH_KEY', requiredForMainnet: true, tier: 'critical', description: 'Invite token hash key' },
  { key: 'WEB_APP_URL', requiredForMainnet: true, tier: 'critical', description: 'Public web app origin' },
  { key: 'VAPID_PUBLIC_KEY', requiredForMainnet: true, tier: 'critical', description: 'Web push public key' },
  { key: 'VAPID_PRIVATE_KEY', requiredForMainnet: true, tier: 'critical', description: 'Web push private key' },
  {
    key: 'DEPOSIT_WATCH_ETH_RPC_URL',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Ethereum deposit watcher RPC',
  },
  {
    key: 'DEPOSIT_WATCH_BNB_RPC_URL',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'BNB deposit watcher RPC',
  },
  {
    key: 'DEPOSIT_WATCH_TRON_RPC_URL',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Tron deposit watcher RPC',
  },
  {
    key: 'DEPOSIT_WATCH_SOLANA_RPC_URL',
    requiredForMainnet: true,
    tier: 'critical',
    description: 'Solana deposit watcher RPC',
  },
  // ── Recommended: feature services (boot with a warning if missing) ─────────
  // These do not touch escrow funds. The platform runs without them; the
  // related feature is simply unavailable until the operator configures it.
  {
    key: 'GOOGLE_OAUTH_CLIENT_ID',
    requiredForMainnet: true,
    tier: 'recommended',
    description: 'Google OAuth client id (social login disabled if unset)',
  },
  {
    key: 'GOOGLE_OAUTH_CLIENT_SECRET',
    requiredForMainnet: true,
    tier: 'recommended',
    description: 'Google OAuth secret (social login disabled if unset)',
  },
  { key: 'MAIL_HOST', requiredForMainnet: true, tier: 'recommended', description: 'Outbound mail host (emails disabled if unset)' },
  { key: 'MAIL_PORT', requiredForMainnet: true, tier: 'recommended', description: 'Outbound mail provider port' },
  { key: 'MAIL_FROM', requiredForMainnet: true, tier: 'recommended', description: 'Outbound mail sender' },
  { key: 'S3_ENDPOINT', requiredForMainnet: true, tier: 'recommended', description: 'Object storage endpoint (uploads disabled if unset)' },
  { key: 'S3_ACCESS_KEY_ID', requiredForMainnet: true, tier: 'recommended', description: 'Object storage access key' },
  { key: 'S3_SECRET_ACCESS_KEY', requiredForMainnet: true, tier: 'recommended', description: 'Object storage secret' },
  { key: 'NODE_ENV', requiredForMainnet: false, description: 'Runtime environment name' },
];

export interface ConfigValidationResult {
  ok: boolean;
  /** Critical keys that are missing — these block boot. */
  missing: string[];
  /** Recommended keys that are missing — these only warn. */
  missingRecommended: string[];
}

/**
 * Validate the environment. When `forMainnet` is true, every mainnet key is
 * checked, but only missing `critical`-tier keys make `ok` false (boot-block).
 * Missing `recommended`-tier keys are reported separately for a warning so a
 * real deployment is not held hostage by an optional feature service.
 */
export function validateConfig(
  env: Readonly<Record<string, string | undefined>>,
  forMainnet: boolean,
): ConfigValidationResult {
  const missing: string[] = [];
  const missingRecommended: string[] = [];
  if (!forMainnet) return { ok: true, missing, missingRecommended };
  for (const spec of ENV_SPECS) {
    if (!spec.requiredForMainnet) continue;
    const value = env[spec.key];
    const isMissing = value === undefined || value.trim() === '';
    if (!isMissing) continue;
    if (spec.tier === 'recommended') {
      missingRecommended.push(spec.key);
    } else {
      missing.push(spec.key);
    }
  }
  return { ok: missing.length === 0, missing, missingRecommended };
}

export function assertRuntimeConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (env.NODE_ENV !== 'test') {
    const raw = env.TRUSTVEXA_MASTER_KEK;
    if (!raw) {
      console.error('CRITICAL ERROR: TRUSTVEXA_MASTER_KEK environment variable is missing.');
      process.exit(1);
    }
    try {
      const kek = Buffer.from(raw, 'base64');
      if (kek.length !== 32) {
        console.error(
          `CRITICAL ERROR: TRUSTVEXA_MASTER_KEK must be a valid 32-byte base64 string. Got ${kek.length} bytes.`,
        );
        process.exit(1);
      }
    } catch (err) {
      console.error('CRITICAL ERROR: TRUSTVEXA_MASTER_KEK is not a valid base64 string.', err);
      process.exit(1);
    }

    if (!env.FILE_LINK_SECRET) {
      console.error('CRITICAL ERROR: FILE_LINK_SECRET environment variable is missing.');
      process.exit(1);
    }
  }

  if (env.MAINNET_ENABLED !== 'true') return;
  const result = validateConfig(env, true);
  if (!result.ok) {
    throw new Error(
      `MAINNET_ENABLED requires critical configuration keys: ${result.missing.join(', ')}`,
    );
  }
  if (result.missingRecommended.length > 0) {
    // Non-fund-critical feature services are not configured. The platform runs,
    // but these features stay disabled until the operator sets them.
    console.warn(
      `[go-live] Mainnet is ON but optional feature services are unconfigured (degraded): ` +
        `${result.missingRecommended.join(', ')}. ` +
        `Email, file uploads, and/or Google login may be unavailable until set.`,
    );
  }
}
