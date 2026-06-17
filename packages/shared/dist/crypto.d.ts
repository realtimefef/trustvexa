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
/** Load + validate the master KEK from the runtime secret store. */
export declare function loadMasterKek(env?: NodeJS.ProcessEnv): Buffer;
/** Generate a fresh random 32-byte DEK (for a new key version). */
export declare function generateDek(): Buffer;
/** Wrap (encrypt) a DEK with the master KEK for storage in the DB. */
export declare function wrapDek(kek: Buffer, dek: Buffer): string;
/** Unwrap (decrypt) a stored DEK with the master KEK. */
export declare function unwrapDek(kek: Buffer, wrapped: string): Buffer;
/**
 * Encrypt a plaintext field value. Returns a self-describing token
 * `tv1:<purpose>:<version>:<iv>.<ct>.<tag>` safe to store in a `*_enc` column.
 */
export declare function encryptField(provider: KeyProvider, purpose: string, plaintext: string | null | undefined): Promise<string | null>;
/** Decrypt a token produced by {@link encryptField}. */
export declare function decryptField(provider: KeyProvider, token: string | null | undefined): Promise<string | null>;
/** Return the key version a token was sealed under (for rotation scans). */
export declare function tokenKeyVersion(token: string): number;
/**
 * Re-encrypt a token to the active key version (key rotation). No-op (returns
 * the same token) when already on the active version, so bulk rotation is
 * idempotent and resumable.
 */
export declare function reencryptField(provider: KeyProvider, token: string | null | undefined): Promise<string | null>;
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
export declare function deriveDek(kek: Buffer, purpose: string, version: number): Buffer;
/**
 * Build a {@link KeyProvider} whose DEKs are derived (never stored) from the
 * master KEK. The KEK may be supplied directly (tests / explicit wiring) or
 * loaded from the environment. The active version per purpose is resolved via
 * `activeVersion`, defaulting to version 1.
 */
export declare function createDerivedKeyProvider(opts?: DerivedKeyProviderOptions): KeyProvider;
/** Constant-time comparison for hashed lookup tokens (e.g. `*_hash`). */
export declare function safeEqualHex(a: string, b: string): boolean;
/**
 * Deterministic keyed lookup hash (HMAC-SHA256, hex) for blind-index columns
 * such as `email_hash`. The key is a dedicated lookup secret, never the KEK, so
 * these searchable hashes stay unlinkable without it. Values are NFKC
 * normalized so equivalent inputs hash identically. *(design §31 PII handling)*
 */
export declare function hashLookup(value: string, key: Buffer | string): string;
//# sourceMappingURL=crypto.d.ts.map