/**
 * Task 3.12 — Unit tests for password hashing, strength policy, and the
 * breached-password (HaveIBeenPwned k-anonymity) check. Reserved-name
 * rejection and lockout thresholds depend on the DB and are covered by the
 * integration suite. (Requirements 2.3, 2.4)
 */
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  checkPasswordStrength,
  hashPassword,
  needsRehash,
  pwnedCount,
  verifyPassword,
} from '../password.js';

describe('password hashing', () => {
  it('hashes with argon2id and verifies the correct password', async () => {
    const plain = 'Str0ng!Passw0rd#42';
    const hash = await hashPassword(plain);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain(plain);
    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, plain + 'x')).toBe(false);
    expect(needsRehash(hash)).toBe(false);
  });
});

describe('password strength policy', () => {
  it('rejects too-short passwords', () => {
    const result = checkPasswordStrength('aB3$');
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/at least/i);
  });

  it('rejects low character-class diversity', () => {
    expect(checkPasswordStrength('aaaaaaaaaaaaaaaa').ok).toBe(false);
  });

  it('rejects passwords containing the username', () => {
    const result = checkPasswordStrength('alice-Str0ng!pwd', { username: 'alice' });
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/username/i);
  });

  it('accepts a strong password', () => {
    const result = checkPasswordStrength('Tr0ub4dour&3xtra-long');
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('breached-password check (k-anonymity)', () => {
  function sha1Suffix(password: string): string {
    return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase().slice(5);
  }

  it('returns the breach count when the suffix matches', async () => {
    const pw = 'password123';
    const body = `${sha1Suffix(pw)}:1337\nDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEAD:1`;
    const fakeFetch = (async () => ({
      ok: true,
      text: async () => body,
    })) as unknown as typeof fetch;
    expect(await pwnedCount(pw, fakeFetch)).toBe(1337);
  });

  it('returns 0 when the suffix is absent', async () => {
    const body = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:9\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:2';
    const fakeFetch = (async () => ({
      ok: true,
      text: async () => body,
    })) as unknown as typeof fetch;
    expect(await pwnedCount('totally-unique-passphrase', fakeFetch)).toBe(0);
  });

  it('throws when the range lookup fails', async () => {
    const fakeFetch = (async () => ({
      ok: false,
      status: 503,
      text: async () => '',
    })) as unknown as typeof fetch;
    await expect(pwnedCount('whatever', fakeFetch)).rejects.toThrow();
  });
});
