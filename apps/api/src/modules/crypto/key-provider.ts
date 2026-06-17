/**
 * Runtime envelope-encryption provider for the API (task 2.9 wiring).
 *
 * Wires the shared, KEK-derived {@link KeyProvider} into the API process so the
 * `*_enc` column helpers (`encryptField` / `decryptField`) have real keys. The
 * master KEK is read from the runtime secret store (`TRUSTVEXA_MASTER_KEK`);
 * the active key version per purpose is read from `encryption_key_versions`,
 * falling back to version 1 when the table has no active row yet (a fresh
 * deployment). DEKs are derived (HKDF) — never stored — and cached for the
 * process lifetime inside the shared provider.
 *
 * The provider is created lazily and memoized so the HTTP server and health
 * probe can boot without the KEK present; the first encryption/decryption
 * resolves and caches it.
 */
import { query } from '@trustvexa/shared';
import {
  createDerivedKeyProvider,
  decryptField,
  encryptField,
  type KeyProvider,
} from '@trustvexa/shared/crypto';

let cached: KeyProvider | null = null;
let kekUnavailable = false;

/** Read the active version for a purpose, defaulting to 1 when none exists. */
async function activeVersionForPurpose(purpose: string): Promise<number> {
  try {
    const res = await query<{ version: number }>(
      `SELECT version FROM encryption_key_versions
         WHERE key_purpose = $1 AND status = 'active'
         ORDER BY version DESC LIMIT 1`,
      [purpose],
    );
    return res.rows[0]?.version ?? 1;
  } catch {
    // Table not migrated yet / DB unavailable: fall back to the genesis version
    // so encryption still functions in minimal environments.
    return 1;
  }
}

/** Return the process-wide envelope-encryption provider, creating it on first use. */
export function getKeyProvider(): KeyProvider {
  if (cached !== null) {
    return cached;
  }
  const provider = createDerivedKeyProvider({ activeVersion: activeVersionForPurpose });
  cached = provider;
  return provider;
}

/** Test helper: reset the memoized provider. */
export function resetKeyProviderCache(): void {
  cached = null;
  kekUnavailable = false;
}

/**
 * Resolve the provider, or `null` when the master KEK is not configured. In
 * production a missing KEK is a hard failure (PII must be encrypted at rest);
 * outside production it degrades to `null` so local/dev/test environments can
 * run without the secret. The "unavailable" state is memoized so a missing KEK
 * is not retried on every request.
 */
function tryGetKeyProvider(): KeyProvider | null {
  if (kekUnavailable) return null;
  try {
    return getKeyProvider();
  } catch (err) {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      throw err;
    }
    kekUnavailable = true;
    return null;
  }
}

/**
 * Encrypt a PII value for an `*_enc` column. Returns the sealed token when the
 * KEK is configured, or the raw value as a dev/test fallback when it is not
 * (never in production, where `tryGetKeyProvider` re-throws). `null`/`undefined`
 * pass through unchanged.
 */
export async function sealPii(
  value: string | null | undefined,
  purpose = 'pii',
): Promise<string | null> {
  if (value === null || value === undefined) return null;
  const provider = tryGetKeyProvider();
  if (provider === null) return value;
  return encryptField(provider, purpose, value);
}

/**
 * Decrypt a value sealed by {@link sealPii}. Tokens produced by `encryptField`
 * start with the `tv1:` prefix; a value without it is treated as a legacy
 * plaintext record and returned as-is so reads stay backward compatible.
 */
export async function openPii(token: string | null | undefined): Promise<string | null> {
  if (token === null || token === undefined) return null;
  if (!token.startsWith('tv1:')) return token;
  const provider = tryGetKeyProvider();
  if (provider === null) return token;
  return decryptField(provider, token);
}
