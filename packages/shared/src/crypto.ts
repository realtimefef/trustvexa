/**
 * Envelope encryption helpers for encryption-at-rest (task 2.9).
 *
 * Model (design §16 "encryption_key_versions" + §31 PII handling):
 *   - A master KEK (key-encryption key) lives only in the runtime secret store
 *     (env `TRUSTVEXA_MASTER_KEK`, base64 of 32 random bytes) — never in the DB.
 *   - Each row in `encryption_key_versions` owns a DEK (data-encryption key)
 *     that is wrapped (AES-256-GCM) by the KEK and stored alongside its version.
 *   - Field/file values are encrypted with the active version's DEK and stored
 *     as a self-describing token that carries its key version, so rotation can
 *     re-encrypt lazily or in bulk via `reencryptField`.
 *
 * No plaintext secret, DEK, or password is ever returned to any caller that did
 * not supply the KEK. All money/PII columns named `*_enc` use this module.
 *
 * The DB lookups are injected via `KeyProvider` so this package stays free of a
 * direct `pg` dependency; the api/worker wire a concrete provider backed by
 * `encryption_key_versions`.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TOKEN_PREFIX = 'tv1';

/** A data-encryption key bound to an `encryption_key_versions` row. */
export interface DataKey {
  /** Monotonic version from `encryption_key_versions.version`. */
  version: number;
  /** Raw 32-byte DEK (already unwrapped from the KEK). */
  key: Buffer;
}

/** Injected resolver over `encryption_key_versions`, keyed by purpose. */
export interface KeyProvider {
  /** The active (status = 'active') DEK for a purpose, e.g. 'pii' | 'file'. */
  getActiveKey(purpose: string): Promise<DataKey>;
  /** A specific historical DEK by version (for decrypt + rotation). */
  getKeyByVersion(purpose: string, version: number): Promise<DataKey>;
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`DEK must be ${KEY_BYTES} bytes, got ${key.length}`);
  }
}

/** Load + validate the master KEK from the runtime secret store. */
export function loadMasterKek(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env.TRUSTVEXA_MASTER_KEK;
  if (!raw) {
    throw new Error('TRUSTVEXA_MASTER_KEK is not set');
  }
  const kek = Buffer.from(raw, 'base64');
  assertKey(kek);
  return kek;
}

/** Generate a fresh random 32-byte DEK (for a new key version). */
export function generateDek(): Buffer {
  return randomBytes(KEY_BYTES);
}

function sealRaw(key: Buffer, plaintext: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join('.');
}

function openRaw(key: Buffer, body: string): Buffer {
  assertKey(key);
  const [ivB64, ctB64, tagB64] = body.split('.');
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error('Malformed ciphertext body');
  }
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
}

/** Wrap (encrypt) a DEK with the master KEK for storage in the DB. */
export function wrapDek(kek: Buffer, dek: Buffer): string {
  assertKey(dek);
  return sealRaw(kek, dek);
}

/** Unwrap (decrypt) a stored DEK with the master KEK. */
export function unwrapDek(kek: Buffer, wrapped: string): Buffer {
  const dek = openRaw(kek, wrapped);
  assertKey(dek);
  return dek;
}

/**
 * Encrypt a plaintext field value. Returns a self-describing token
 * `tv1:<purpose>:<version>:<iv>.<ct>.<tag>` safe to store in a `*_enc` column.
 */
export async function encryptField(
  provider: KeyProvider,
  purpose: string,
  plaintext: string | null | undefined,
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined) return null;
  const { version, key } = await provider.getActiveKey(purpose);
  const body = sealRaw(key, Buffer.from(plaintext, 'utf8'));
  return [TOKEN_PREFIX, purpose, String(version), body].join(':');
}

interface ParsedToken {
  purpose: string;
  version: number;
  body: string;
}

function parseToken(token: string): ParsedToken {
  const parts = token.split(':');
  if (parts.length !== 4 || parts[0] !== TOKEN_PREFIX) {
    throw new Error('Unrecognized ciphertext token');
  }
  const version = Number(parts[2]);
  if (!Number.isInteger(version)) {
    throw new Error('Invalid key version in ciphertext token');
  }
  return { purpose: parts[1]!, version, body: parts[3]! };
}

/** Decrypt a token produced by {@link encryptField}. */
export async function decryptField(
  provider: KeyProvider,
  token: string | null | undefined,
): Promise<string | null> {
  if (token === null || token === undefined) return null;
  const { purpose, version, body } = parseToken(token);
  const { key } = await provider.getKeyByVersion(purpose, version);
  return openRaw(key, body).toString('utf8');
}

/** Return the key version a token was sealed under (for rotation scans). */
export function tokenKeyVersion(token: string): number {
  return parseToken(token).version;
}

/**
 * Re-encrypt a token to the active key version (key rotation). No-op (returns
 * the same token) when already on the active version, so bulk rotation is
 * idempotent and resumable.
 */
export async function reencryptField(
  provider: KeyProvider,
  token: string | null | undefined,
): Promise<string | null> {
  if (token === null || token === undefined) return null;
  const { purpose, version } = parseToken(token);
  const active = await provider.getActiveKey(purpose);
  if (version === active.version) return token;
  const plaintext = await decryptField(provider, token);
  return encryptField(provider, purpose, plaintext);
}

/** Options for {@link createDerivedKeyProvider}. */
export interface DerivedKeyProviderOptions {
  /** Master KEK. When omitted, it is loaded from the environment. */
  kek?: Buffer;
  /** Resolve the active key version for a purpose. Defaults to version 1. */
  activeVersion?: (purpose: string) => number | Promise<number>;
  /** Environment to read the master KEK from when `kek` is omitted. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Deterministically derive a 32-byte DEK from the master KEK for a given
 * (purpose, version) via HKDF-SHA256. The same inputs always yield the same
 * key, so any historical version can be recovered for decryption and rotation
 * is simply a version bump — DEKs are never stored.
 */
export function deriveDek(kek: Buffer, purpose: string, version: number): Buffer {
  const salt = Buffer.from(`tv-dek-salt:${purpose}`, 'utf8');
  const info = Buffer.from(`tv-dek:${purpose}:v${version}`, 'utf8');
  return Buffer.from(hkdfSync('sha256', kek, salt, info, KEY_BYTES));
}

/**
 * Build a {@link KeyProvider} whose DEKs are derived (never stored) from the
 * master KEK. The KEK may be supplied directly (tests / explicit wiring) or
 * loaded from the environment. The active version per purpose is resolved via
 * `activeVersion`, defaulting to version 1.
 */
export function createDerivedKeyProvider(opts: DerivedKeyProviderOptions = {}): KeyProvider {
  const kek = opts.kek ?? loadMasterKek(opts.env ?? process.env);
  const resolveActive = opts.activeVersion ?? ((): number => 1);
  return {
    async getActiveKey(purpose: string): Promise<DataKey> {
      const version = await resolveActive(purpose);
      return { version, key: deriveDek(kek, purpose, version) };
    },
    async getKeyByVersion(purpose: string, version: number): Promise<DataKey> {
      return { version, key: deriveDek(kek, purpose, version) };
    },
  };
}

/** Constant-time comparison for hashed lookup tokens (e.g. `*_hash`). */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Deterministic keyed lookup hash (HMAC-SHA256, hex) for blind-index columns
 * such as `email_hash`. The key is a dedicated lookup secret, never the KEK, so
 * these searchable hashes stay unlinkable without it. Values are NFKC
 * normalized so equivalent inputs hash identically. *(design §31 PII handling)*
 */
export function hashLookup(value: string, key: Buffer | string): string {
  const k = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  return createHmac('sha256', k).update(value.normalize('NFKC')).digest('hex');
}
