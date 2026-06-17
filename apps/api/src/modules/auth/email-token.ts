/**
 * Single-use signed email tokens (task 3.6).
 *
 * A random opaque token is handed to the user (by email); only its SHA-256
 * hash is stored in `auth_tokens`. Tokens are single-use: validation atomically
 * marks the row used + revoked, so a token cannot be replayed. Issuing a new
 * token of a given type revokes any earlier live token of that type.
 * (Requirements 2.3, 2.4, 3.6)
 */
import { randomBytes } from 'node:crypto';

import * as repo from './auth.repository.js';
import { hashToken } from './token-store.js';

const TOKEN_BYTES = 32;

export const SINGLE_USE_TTL_MS: Record<repo.SingleUseTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
  recovery_email: 24 * 60 * 60 * 1000,
};

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/** Issue a single-use opaque token of the given type, persisting only its hash. */
export async function issueSingleUseToken(
  userId: string,
  tokenType: repo.SingleUseTokenType,
): Promise<IssuedToken> {
  await repo.revokeSingleUseTokensOfType(userId, tokenType);
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + SINGLE_USE_TTL_MS[tokenType]);
  await repo.insertSingleUseToken({ userId, tokenType, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export interface ConsumedToken {
  userId: string;
}

/** Validate and atomically consume a single-use token. Returns null when invalid. */
export async function consumeSingleUseToken(
  token: string,
  tokenType: repo.SingleUseTokenType,
): Promise<ConsumedToken | null> {
  const record = await repo.findSingleUseToken(hashToken(token), tokenType);
  if (!record) return null;
  if (record.used_at || record.revoked_at) return null;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return null;
  await repo.consumeSingleUseToken(record.id);
  return { userId: record.user_id };
}
