/**
 * JWT access/refresh issuance and verification (task 3.4).
 *
 * Access tokens are short-lived (~15 min) and kept in client memory; refresh
 * tokens are longer-lived, rotated on every use, and stored in an
 * httpOnly/Secure/SameSite cookie. Each token carries a unique `jti` so it can
 * be revoked via the denylist (task 3.5). Roles mirror `users.account_type`.
 * (Requirements 3.1, 3.3, 3.4)
 */
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import type { AuthConfig } from './auth.config.js';

/** Account role, aligned with the `account_type` enum (user | middleman). */
export type AccountRole = 'user' | 'middleman';

export interface AccessClaims {
  sub: string;
  role: AccountRole;
  sid: string;
  type: 'access';
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshClaims {
  sub: string;
  sid: string;
  type: 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

export interface IssuedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

function expiryOf(token: string): Date {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) {
      throw new Error('Signed token is missing an exp claim.');
    }
    return new Date(decoded.exp * 1000);
  } catch (err) {
    throw new Error(`Failed to decode JWT: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function issueAccessToken(
  params: { userId: string; role: AccountRole; sessionId: string },
  cfg: AuthConfig,
): IssuedToken {
  const jti = randomUUID();
  const options = {
    algorithm: 'HS256',
    subject: params.userId,
    jwtid: jti,
    issuer: cfg.issuer,
    audience: cfg.audience,
    expiresIn: cfg.accessTtl,
  } as unknown as jwt.SignOptions;
  const token = jwt.sign(
    { role: params.role, sid: params.sessionId, type: 'access' },
    cfg.accessSecret,
    options,
  );
  return { token, jti, expiresAt: expiryOf(token) };
}

export function issueRefreshToken(
  params: { userId: string; sessionId: string },
  cfg: AuthConfig,
): IssuedToken {
  const jti = randomUUID();
  const options = {
    algorithm: 'HS256',
    subject: params.userId,
    jwtid: jti,
    issuer: cfg.issuer,
    audience: cfg.audience,
    expiresIn: cfg.refreshTtl,
  } as unknown as jwt.SignOptions;
  const token = jwt.sign({ sid: params.sessionId, type: 'refresh' }, cfg.refreshSecret, options);
  return { token, jti, expiresAt: expiryOf(token) };
}

export function verifyAccessToken(token: string, cfg: AuthConfig): AccessClaims {
  const payload = jwt.verify(token, cfg.accessSecret, {
    algorithms: ['HS256'],
    issuer: cfg.issuer,
    audience: cfg.audience,
  }) as AccessClaims;
  if (payload.type !== 'access') {
    throw new Error('Token is not an access token.');
  }
  return payload;
}

export function verifyRefreshToken(token: string, cfg: AuthConfig): RefreshClaims {
  const payload = jwt.verify(token, cfg.refreshSecret, {
    algorithms: ['HS256'],
    issuer: cfg.issuer,
    audience: cfg.audience,
  }) as RefreshClaims;
  if (payload.type !== 'refresh') {
    throw new Error('Token is not a refresh token.');
  }
  return payload;
}
