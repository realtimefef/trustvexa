import { describe, expect, it } from 'vitest';
import * as totpService from '../totp.service.js';

describe('TOTP cryptoprimitives', () => {
  it('generates a base32 secret of correct format', () => {
    const secret = totpService.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('generates valid backup codes', () => {
    const codes = totpService.generateBackupCodes();
    expect(codes.length).toBe(8);
    codes.forEach((code) => {
      expect(code).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  it('hashes backup codes correctly (Argon2id — async)', async () => {
    const code = 'abcdef12';
    const hash = await totpService.hashBackupCode(code);
    // Argon2id hashes start with the $argon2id$ prefix
    expect(hash).toMatch(/^\$argon2id\$/);
    // Verify round-trips correctly
    expect(await totpService.verifyBackupCode(hash, code)).toBe(true);
    expect(await totpService.verifyBackupCode(hash, 'wrongcode')).toBe(false);
  });
});
