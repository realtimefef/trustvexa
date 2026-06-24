/**
 * Auth data access (tasks 3.1, 3.2, 3.4, 3.5).
 *
 * Thin, parameterized SQL over the §16 schema: `users`, `user_sessions`,
 * `auth_tokens`, `terms_acceptances`, `reserved_names`, `policy_versions`,
 * `login_attempts`, `account_lockouts`, `account_security_events`. All money
 * and PII rules live above this layer; this module only reads/writes rows.
 */
import { getClient, query } from '@trustvexa/shared';
import type { PoolClient } from 'pg';

import type { AccountRole } from './jwt.js';

export interface UserRecord {
  id: string;
  username: string;
  account_type: AccountRole;
  account_status: string;
  account_label: string;
  password_hash: string | null;
  email_hash: string | null;
  email_enc: string | null;
  recovery_email_enc: string | null;
  totp_secret_enc?: string | null;
  totp_enabled?: boolean;
  totp_backup_codes_enc?: string | null;
}

const USER_COLUMNS =
  'id, username, account_type, account_status, account_label, password_hash, email_hash, email_enc, recovery_email_enc, totp_secret_enc, totp_enabled, totp_backup_codes_enc';

export interface CreateUserInput {
  username: string;
  emailHash: string;
  emailEnc: string | null;
  signupDetailsEnc: string | null;
  passwordHash: string;
  accountType: AccountRole;
  ageConfirmed: boolean;
}

export async function findUserByEmailHash(emailHash: string): Promise<UserRecord | null> {
  const res = await query<UserRecord>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email_hash = $1 LIMIT 1`,
    [emailHash],
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const res = await query<UserRecord>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`, [
    id,
  ]);
  return res.rows[0] ?? null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const res = await query(`SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1`, [
    username,
  ]);
  return res.rows.length > 0;
}

export async function isEmailTaken(emailHash: string): Promise<boolean> {
  const res = await query(`SELECT 1 FROM users WHERE email_hash = $1 LIMIT 1`, [emailHash]);
  return res.rows.length > 0;
}

/**
 * Scrub all PII from a deleted account so nothing personal remains and — most
 * importantly — so the same email/recovery address can be used to register a
 * brand-new account. Clears both lookup hashes (email_hash is the uniqueness
 * key) and the encrypted blobs, and anonymizes the username.
 */
export async function scrubDeletedUserPii(userId: string): Promise<void> {
  await query(
    `UPDATE users
        SET email_enc = NULL, recovery_email_enc = NULL,
            email_hash = NULL, recovery_email_hash = NULL,
            username = 'deleted_' || left(replace(id::text, '-', ''), 10),
            updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

export async function isReservedName(value: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM reserved_names WHERE lower(reserved_value) = lower($1) LIMIT 1`,
    [value],
  );
  return res.rows.length > 0;
}

export async function getActivePolicyVersion(docType: string): Promise<string | null> {
  const res = await query<{ version: string }>(
    `SELECT version FROM policy_versions
      WHERE doc_type = $1
      ORDER BY published_at DESC NULLS LAST
      LIMIT 1`,
    [docType],
  );
  return res.rows[0]?.version ?? null;
}

export async function createUser(
  input: CreateUserInput,
  policyAcceptances: Array<{ docType: string; version: string }>,
): Promise<UserRecord> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const inserted = await client.query<UserRecord>(
      `INSERT INTO users
         (username, email_hash, email_enc, signup_details_enc, password_hash,
          account_type, account_status, account_label, age_confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', 'new_user',
         CASE WHEN $7 THEN now() ELSE NULL END)
       RETURNING ${USER_COLUMNS}`,
      [
        input.username,
        input.emailHash,
        input.emailEnc,
        input.signupDetailsEnc,
        input.passwordHash,
        input.accountType,
        input.ageConfirmed,
      ],
    );
    const user = inserted.rows[0];
    if (!user) throw new Error('user insert returned no row');
    for (const acc of policyAcceptances) {
      await client.query(
        `INSERT INTO terms_acceptances (user_id, doc_type, version, accepted_at)
         VALUES ($1, $2, $3, now())`,
        [user.id, acc.docType, acc.version],
      );
    }
    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
    passwordHash,
    userId,
  ]);
}

export interface CreateSessionInput {
  userId: string;
  device: string | null;
  ip: string | null;
  userAgent: string | null;
  rememberMe: boolean;
  expiresAt: Date;
}

export async function createSession(input: CreateSessionInput): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO user_sessions
       (user_id, device, ip, user_agent, remember_me, expires_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id`,
    [
      input.userId,
      input.device,
      input.ip,
      input.userAgent,
      input.rememberMe,
      input.expiresAt.toISOString(),
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('session insert returned no row');
  return row.id;
}

export async function touchSession(sessionId: string): Promise<void> {
  await query(`UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, [sessionId]);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [
    sessionId,
  ]);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await query(
    `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

export interface InsertRefreshInput {
  userId: string;
  sessionId: string;
  tokenHash: string;
  jti: string;
  audience: string;
  issuedAt: Date;
  expiresAt: Date;
}

export async function insertRefreshToken(input: InsertRefreshInput): Promise<void> {
  await query(
    `INSERT INTO auth_tokens
       (user_id, session_id, token_type, token_hash, jwt_id, audience, issued_at, expires_at)
     VALUES ($1, $2, 'refresh', $3, $4, $5, $6, $7)`,
    [
      input.userId,
      input.sessionId,
      input.tokenHash,
      input.jti,
      input.audience,
      input.issuedAt.toISOString(),
      input.expiresAt.toISOString(),
    ],
  );
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  jwt_id: string | null;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export async function findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
  const res = await query<RefreshTokenRecord>(
    `SELECT id, user_id, session_id, jwt_id, used_at, revoked_at, expires_at
       FROM auth_tokens
      WHERE token_hash = $1 AND token_type = 'refresh'
      LIMIT 1`,
    [tokenHash],
  );
  return res.rows[0] ?? null;
}

export async function markRefreshTokenConsumed(id: string): Promise<void> {
  await query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [id]);
}

export async function findRefreshTokenForUpdate(
  client: PoolClient,
  tokenHash: string,
): Promise<RefreshTokenRecord | null> {
  const res = await client.query(
    `SELECT id, user_id, session_id, jwt_id, used_at, revoked_at, expires_at
       FROM auth_tokens
      WHERE token_hash = $1 AND token_type = 'refresh'
      FOR UPDATE`,
    [tokenHash],
  );
  return res.rows[0] ?? null;
}

export async function markRefreshTokenConsumedTx(client: PoolClient, id: string): Promise<void> {
  await client.query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [
    id,
  ]);
}

export async function revokeSessionTx(client: PoolClient, sessionId: string): Promise<void> {
  await client.query(
    `UPDATE user_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId],
  );
}

export async function listActiveRefreshTokens(
  userId: string,
): Promise<Array<{ jwt_id: string; expires_at: string | null }>> {
  const res = await query<{ jwt_id: string; expires_at: string | null }>(
    `SELECT jwt_id, expires_at FROM auth_tokens
      WHERE user_id = $1 AND token_type = 'refresh'
        AND revoked_at IS NULL AND jwt_id IS NOT NULL`,
    [userId],
  );
  return res.rows;
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await query(
    `UPDATE auth_tokens SET revoked_at = now()
      WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`,
    [userId],
  );
}

export async function recordSecurityEvent(input: {
  userId: string;
  eventType: string;
  ip: string | null;
  device: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO account_security_events (user_id, event_type, ip, device, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.eventType,
      input.ip,
      input.device,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

export async function recordLoginAttempt(input: {
  identifierHash: string | null;
  ip: string | null;
  success: boolean;
}): Promise<void> {
  await query(`INSERT INTO login_attempts (identifier_hash, ip, success) VALUES ($1, $2, $3)`, [
    input.identifierHash,
    input.ip,
    input.success,
  ]);
}

export async function hasActiveLockout(identifierHash: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM account_lockouts
      WHERE identifier_hash = $1 AND locked_until IS NOT NULL AND locked_until > now()
      LIMIT 1`,
    [identifierHash],
  );
  return res.rows.length > 0;
}

// ===========================================================================
// Single-use signed tokens (auth_tokens: email_verify | password_reset | recovery_email)
// Tasks 3.6, 3.7
// ===========================================================================

export type SingleUseTokenType = 'email_verify' | 'password_reset' | 'recovery_email';

export interface SingleUseTokenRecord {
  id: string;
  user_id: string;
  token_type: string;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export async function insertSingleUseToken(input: {
  userId: string;
  tokenType: SingleUseTokenType;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await query(
    `INSERT INTO auth_tokens (user_id, token_type, token_hash, issued_at, expires_at)
     VALUES ($1, $2, $3, now(), $4)`,
    [input.userId, input.tokenType, input.tokenHash, input.expiresAt.toISOString()],
  );
}

export async function findSingleUseToken(
  tokenHash: string,
  tokenType: SingleUseTokenType,
): Promise<SingleUseTokenRecord | null> {
  const res = await query<SingleUseTokenRecord>(
    `SELECT id, user_id, token_type, used_at, revoked_at, expires_at
       FROM auth_tokens WHERE token_hash = $1 AND token_type = $2 LIMIT 1`,
    [tokenHash, tokenType],
  );
  return res.rows[0] ?? null;
}

export async function consumeSingleUseToken(id: string): Promise<void> {
  await query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [id]);
}

export async function revokeSingleUseTokensOfType(
  userId: string,
  tokenType: SingleUseTokenType,
): Promise<void> {
  await query(
    `UPDATE auth_tokens SET revoked_at = now()
      WHERE user_id = $1 AND token_type = $2 AND revoked_at IS NULL AND used_at IS NULL`,
    [userId, tokenType],
  );
}

// ===========================================================================
// Step-up confirmations (step_up_confirmations) — task 3.6
// ===========================================================================

export interface StepUpRecord {
  id: string;
  user_id: string;
  action_type: string | null;
  deal_id: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
}

export async function insertStepUp(input: {
  userId: string;
  actionType: string;
  dealId: string | null;
  tokenHash: string;
  expiresAt: Date;
}): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO step_up_confirmations (user_id, action_type, deal_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.userId, input.actionType, input.dealId, input.tokenHash, input.expiresAt.toISOString()],
  );
  const row = res.rows[0];
  if (!row) throw new Error('step_up insert returned no row');
  return row.id;
}

export async function findStepUp(
  tokenHash: string,
  actionType: string,
): Promise<StepUpRecord | null> {
  const res = await query<StepUpRecord>(
    `SELECT id, user_id, action_type, deal_id, confirmed_at, expires_at
       FROM step_up_confirmations WHERE token_hash = $1 AND action_type = $2 LIMIT 1`,
    [tokenHash, actionType],
  );
  return res.rows[0] ?? null;
}

export async function confirmStepUp(id: string): Promise<void> {
  await query(`UPDATE step_up_confirmations SET confirmed_at = now() WHERE id = $1`, [id]);
}

// ===========================================================================
// Credential & recovery changes — task 3.7
// ===========================================================================

export async function updateEmail(
  userId: string,
  emailHash: string,
  emailEnc: string | null,
): Promise<void> {
  await query(
    `UPDATE users SET email_hash = $1, email_enc = $2, updated_at = now() WHERE id = $3`,
    [emailHash, emailEnc, userId],
  );
}

export async function setRecoveryEmail(
  userId: string,
  recoveryEmailHash: string,
  recoveryEmailEnc: string | null,
): Promise<void> {
  await query(
    `UPDATE users SET recovery_email_hash = $1, recovery_email_enc = $2, updated_at = now() WHERE id = $3`,
    [recoveryEmailHash, recoveryEmailEnc, userId],
  );
}

export async function findUserByRecoveryEmailHash(hash: string): Promise<UserRecord | null> {
  const res = await query<UserRecord>(
    `SELECT ${USER_COLUMNS} FROM users WHERE recovery_email_hash = $1 LIMIT 1`,
    [hash],
  );
  return res.rows[0] ?? null;
}

// ===========================================================================
// Brute-force lockout (login_attempts / account_lockouts) — task 3.9
// ===========================================================================

export async function countRecentFailedAttempts(
  identifierHash: string,
  withinSeconds: number,
): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM login_attempts
      WHERE identifier_hash = $1 AND success = false
        AND created_at > now() - ($2 || ' seconds')::interval`,
    [identifierHash, String(withinSeconds)],
  );
  return Number(res.rows[0]?.n ?? '0');
}

export async function createLockout(input: {
  userId: string | null;
  identifierHash: string;
  reason: string;
  lockedUntil: Date;
}): Promise<void> {
  await query(
    `INSERT INTO account_lockouts (user_id, identifier_hash, reason, locked_until)
     VALUES ($1, $2, $3, $4)`,
    [input.userId, input.identifierHash, input.reason, input.lockedUntil.toISOString()],
  );
}

// ===========================================================================
// Sessions & devices listing + security log — task 3.8
// ===========================================================================

export interface SessionRecord {
  id: string;
  device: string | null;
  ip: string | null;
  user_agent: string | null;
  remember_me: boolean | null;
  last_seen_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export async function listActiveSessions(userId: string): Promise<SessionRecord[]> {
  const res = await query<SessionRecord>(
    `SELECT id, device, ip, user_agent, remember_me, last_seen_at, expires_at, revoked_at, created_at
       FROM user_sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
      ORDER BY last_seen_at IS NULL, last_seen_at DESC`,
    [userId],
  );
  return res.rows;
}

export async function findSessionForUser(
  sessionId: string,
  userId: string,
): Promise<SessionRecord | null> {
  const res = await query<SessionRecord>(
    `SELECT id, device, ip, user_agent, remember_me, last_seen_at, expires_at, revoked_at, created_at
       FROM user_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [sessionId, userId],
  );
  return res.rows[0] ?? null;
}

export async function revokeRefreshTokensForSession(sessionId: string): Promise<string[]> {
  const res = await query<{ jwt_id: string }>(
    `UPDATE auth_tokens SET revoked_at = now()
      WHERE session_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL AND jwt_id IS NOT NULL
      RETURNING jwt_id`,
    [sessionId],
  );
  return res.rows.map((r) => r.jwt_id);
}

export interface SecurityEventRecord {
  id: string;
  event_type: string | null;
  ip: string | null;
  device: string | null;
  created_at: string;
}

export async function listSecurityEvents(
  userId: string,
  limit = 50,
): Promise<SecurityEventRecord[]> {
  const res = await query<SecurityEventRecord>(
    `SELECT id, event_type, ip, device, created_at
       FROM account_security_events WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return res.rows;
}

// ===========================================================================
// Account deactivation & deletion — task 3.10
// ===========================================================================

export async function setAccountStatus(userId: string, status: string): Promise<void> {
  await query(`UPDATE users SET account_status = $1, updated_at = now() WHERE id = $2`, [
    status,
    userId,
  ]);
}

export async function getUserAccountFlags(
  userId: string,
): Promise<{ account_status: string; legal_hold: boolean } | null> {
  const res = await query<{ account_status: string; legal_hold: boolean }>(
    `SELECT account_status, legal_hold FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function countActiveDealsForUser(userId: string): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM deals
      WHERE (buyer_id = $1 OR seller_id = $1 OR middleman_id = $1)
        AND status NOT IN ('Cancelled', 'Released', 'Refunded', 'Expired')`,
    [userId],
  );
  return Number(res.rows[0]?.n ?? '0');
}

export async function insertDeactivation(userId: string, reason: string | null): Promise<void> {
  await query(
    `INSERT INTO account_deactivations (user_id, reason, deactivated_at) VALUES ($1, $2, now())`,
    [userId, reason],
  );
}

export async function markReactivated(userId: string): Promise<void> {
  await query(
    `UPDATE account_deactivations SET reactivated_at = now()
      WHERE user_id = $1 AND reactivated_at IS NULL`,
    [userId],
  );
}

export async function insertDeletionRequest(input: {
  userId: string;
  status: string;
  activeDealCount: number;
  userNotice: string | null;
}): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO account_deletion_requests (user_id, status, active_deal_count, user_notice, requested_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING id`,
    [input.userId, input.status, input.activeDealCount, input.userNotice],
  );
  const row = res.rows[0];
  if (!row) throw new Error('deletion request insert returned no row');
  return row.id;
}

export async function insertAccountDeletion(input: {
  userId: string;
  requestedBy: string;
  reason: string | null;
  deletionType: string;
}): Promise<void> {
  await query(
    `INSERT INTO account_deletions (user_id, requested_by, reason, deletion_type, deleted_at)
     VALUES ($1, $2, $3, $4, now())`,
    [input.userId, input.requestedBy, input.reason, input.deletionType],
  );
}

export async function completeDeletionRequest(userId: string): Promise<void> {
  await query(
    `UPDATE account_deletion_requests SET status = 'completed', completed_at = now()
      WHERE user_id = $1 AND status <> 'completed'`,
    [userId],
  );
}

export async function countRecentRegistrationsByIp(
  ip: string,
  withinSeconds: number,
): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM account_security_events
      WHERE event_type = 'register' AND ip = $1
        AND created_at > now() - ($2 || ' seconds')::interval`,
    [ip, String(withinSeconds)],
  );
  return Number(res.rows[0]?.n ?? '0');
}

export async function acceptPolicy(
  userId: string,
  docType: string,
  version: string,
): Promise<void> {
  const check = await query(
    `SELECT 1 FROM terms_acceptances WHERE user_id = $1 AND doc_type = $2 AND version = $3 LIMIT 1`,
    [userId, docType, version],
  );
  if (check.rows.length === 0) {
    await query(
      `INSERT INTO terms_acceptances (user_id, doc_type, version, accepted_at)
       VALUES ($1, $2, $3, now())`,
      [userId, docType, version],
    );
  }
}

export async function updateTOTP(
  userId: string,
  secretEnc: string | null,
  enabled: boolean,
  backupCodesEnc: string | null,
): Promise<void> {
  await query(
    `UPDATE users
     SET totp_secret_enc = $2, totp_enabled = $3, totp_backup_codes_enc = $4, updated_at = now()
     WHERE id = $1`,
    [userId, secretEnc, enabled, backupCodesEnc],
  );
}
