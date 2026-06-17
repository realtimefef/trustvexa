/**
 * Task 3.12 — Unit tests for JWT issuance / verification / rotation.
 *
 * Covers access+refresh round-trips, per-token `jti` uniqueness (rotation),
 * secret separation, expiry rejection, and type guards. The denylist /
 * revocation enforcement on REST + WS is exercised by the integration suite
 * (needs live Redis). (Requirements 3.4, 3.5)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadAuthConfig } from '../auth.config.js';
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.js';

const baseEnv = {
  JWT_ACCESS_SECRET: 'access-secret-000000000000000000000000',
  JWT_REFRESH_SECRET: 'refresh-secret-111111111111111111111111',
  AUTH_LOOKUP_HASH_KEY: Buffer.alloc(32, 7).toString('base64'),
} as NodeJS.ProcessEnv;

const cfg = loadAuthConfig(baseEnv);

afterEach(() => {
  vi.useRealTimers();
});

describe('JWT access tokens', () => {
  it('round-trips subject, role, session and type', () => {
    const { token, jti } = issueAccessToken(
      { userId: 'user-1', role: 'middleman', sessionId: 'sess-1' },
      cfg,
    );
    const claims = verifyAccessToken(token, cfg);
    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe('middleman');
    expect(claims.sid).toBe('sess-1');
    expect(claims.type).toBe('access');
    expect(claims.jti).toBe(jti);
  });

  it('rejects an access token verified with the refresh secret', () => {
    const { token } = issueAccessToken({ userId: 'u', role: 'user', sessionId: 's' }, cfg);
    expect(() => verifyRefreshToken(token, cfg)).toThrow();
  });

  it('rejects a tampered / wrong-secret token', () => {
    const otherCfg = loadAuthConfig({
      ...baseEnv,
      JWT_ACCESS_SECRET: 'different-access-secret-aaaaaaaaaaaaaaaa',
    });
    const { token } = issueAccessToken({ userId: 'u', role: 'user', sessionId: 's' }, cfg);
    expect(() => verifyAccessToken(token, otherCfg)).toThrow();
  });

  it('rejects an expired access token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const shortCfg = loadAuthConfig({ ...baseEnv, JWT_ACCESS_TTL: '1s' });
    const { token } = issueAccessToken({ userId: 'u', role: 'user', sessionId: 's' }, shortCfg);
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    expect(() => verifyAccessToken(token, shortCfg)).toThrow();
  });
});

describe('JWT refresh tokens', () => {
  it('round-trips and is typed as refresh', () => {
    const { token } = issueRefreshToken({ userId: 'user-2', sessionId: 'sess-2' }, cfg);
    const claims = verifyRefreshToken(token, cfg);
    expect(claims.sub).toBe('user-2');
    expect(claims.sid).toBe('sess-2');
    expect(claims.type).toBe('refresh');
  });

  it('mints a fresh jti on every issue (rotation)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const { jti } = issueRefreshToken({ userId: 'u', sessionId: 's' }, cfg);
      expect(seen.has(jti)).toBe(false);
      seen.add(jti);
    }
    expect(seen.size).toBe(50);
  });

  it('rejects a refresh token verified with the access secret', () => {
    const { token } = issueRefreshToken({ userId: 'u', sessionId: 's' }, cfg);
    expect(() => verifyAccessToken(token, cfg)).toThrow();
  });
});
