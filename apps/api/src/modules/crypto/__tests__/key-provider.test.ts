import { describe, expect, it } from 'vitest';

import {
  createDerivedKeyProvider,
  decryptField,
  deriveDek,
  encryptField,
  reencryptField,
  tokenKeyVersion,
} from '@trustvexa/shared/crypto';

const KEK = Buffer.alloc(32, 7); // deterministic 32-byte test KEK

describe('deriveDek', () => {
  it('is deterministic for the same (purpose, version)', () => {
    expect(deriveDek(KEK, 'pii', 1).equals(deriveDek(KEK, 'pii', 1))).toBe(true);
  });

  it('produces distinct keys across purposes and versions', () => {
    const a = deriveDek(KEK, 'pii', 1);
    const b = deriveDek(KEK, 'pii', 2);
    const c = deriveDek(KEK, 'file', 1);
    expect(a.equals(b)).toBe(false);
    expect(a.equals(c)).toBe(false);
    expect(a.length).toBe(32);
  });
});

describe('createDerivedKeyProvider', () => {
  it('round-trips encryptField -> decryptField', async () => {
    const provider = createDerivedKeyProvider({ kek: KEK });
    const token = await encryptField(provider, 'pii', 'alice@example.com');
    expect(token).not.toBeNull();
    expect(token!.startsWith('tv1:pii:1:')).toBe(true);
    expect(await decryptField(provider, token)).toBe('alice@example.com');
  });

  it('passes null/undefined through unchanged', async () => {
    const provider = createDerivedKeyProvider({ kek: KEK });
    expect(await encryptField(provider, 'pii', null)).toBeNull();
    expect(await decryptField(provider, undefined)).toBeNull();
  });

  it('seals under the resolved active version', async () => {
    const provider = createDerivedKeyProvider({ kek: KEK, activeVersion: () => 3 });
    const token = await encryptField(provider, 'pii', 'secret');
    expect(tokenKeyVersion(token!)).toBe(3);
    expect(await decryptField(provider, token)).toBe('secret');
  });

  it('re-encrypts an old version to the active version (rotation)', async () => {
    const v1 = createDerivedKeyProvider({ kek: KEK, activeVersion: () => 1 });
    const oldToken = await encryptField(v1, 'pii', 'rotate-me');

    const v2 = createDerivedKeyProvider({ kek: KEK, activeVersion: () => 2 });
    const rotated = await reencryptField(v2, oldToken);
    expect(tokenKeyVersion(rotated!)).toBe(2);
    expect(await decryptField(v2, rotated)).toBe('rotate-me');
  });

  it('a different KEK cannot decrypt another KEK ciphertext', async () => {
    const a = createDerivedKeyProvider({ kek: Buffer.alloc(32, 1) });
    const b = createDerivedKeyProvider({ kek: Buffer.alloc(32, 2) });
    const token = await encryptField(a, 'pii', 'top-secret');
    await expect(decryptField(b, token)).rejects.toThrow();
  });
});
