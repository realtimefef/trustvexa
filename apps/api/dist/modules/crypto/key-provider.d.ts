import { type KeyProvider } from '@trustvexa/shared/crypto';
/** Return the process-wide envelope-encryption provider, creating it on first use. */
export declare function getKeyProvider(): KeyProvider;
/** Test helper: reset the memoized provider. */
export declare function resetKeyProviderCache(): void;
/**
 * Encrypt a PII value for an `*_enc` column. Returns the sealed token when the
 * KEK is configured, or the raw value as a dev/test fallback when it is not
 * (never in production, where `tryGetKeyProvider` re-throws). `null`/`undefined`
 * pass through unchanged.
 */
export declare function sealPii(value: string | null | undefined, purpose?: string): Promise<string | null>;
/**
 * Decrypt a value sealed by {@link sealPii}. Tokens produced by `encryptField`
 * start with the `tv1:` prefix; a value without it is treated as a legacy
 * plaintext record and returned as-is so reads stay backward compatible.
 */
export declare function openPii(token: string | null | undefined): Promise<string | null>;
//# sourceMappingURL=key-provider.d.ts.map