/**
 * Auth data access (tasks 3.1, 3.2, 3.4, 3.5).
 *
 * Thin, parameterized SQL over the §16 schema: `users`, `user_sessions`,
 * `auth_tokens`, `terms_acceptances`, `reserved_names`, `policy_versions`,
 * `login_attempts`, `account_lockouts`, `account_security_events`. All money
 * and PII rules live above this layer; this module only reads/writes rows.
 */
import { getClient, query } from '@trustvexa/shared';
const USER_COLUMNS = 'id, username, account_type, account_status, account_label, password_hash, email_hash, email_enc, recovery_email_enc, totp_secret_enc, totp_enabled, totp_backup_codes_enc';
export async function findUserByEmailHash(emailHash) {
    const res = await query(`SELECT ${USER_COLUMNS} FROM users WHERE email_hash = $1 LIMIT 1`, [emailHash]);
    return res.rows[0] ?? null;
}
export async function findUserById(id) {
    const res = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`, [
        id,
    ]);
    return res.rows[0] ?? null;
}
export async function isUsernameTaken(username) {
    const res = await query(`SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1`, [
        username,
    ]);
    return res.rows.length > 0;
}
export async function isEmailTaken(emailHash) {
    const res = await query(`SELECT 1 FROM users WHERE email_hash = $1 LIMIT 1`, [emailHash]);
    return res.rows.length > 0;
}
/**
 * Scrub all PII from a deleted account so nothing personal remains and — most
 * importantly — so the same email/recovery address can be used to register a
 * brand-new account. Clears both lookup hashes (email_hash is the uniqueness
 * key) and the encrypted blobs, and anonymizes the username.
 */
export async function scrubDeletedUserPii(userId) {
    await query(`UPDATE users
        SET email_enc = NULL, recovery_email_enc = NULL,
            email_hash = NULL, recovery_email_hash = NULL,
            username = 'deleted_' || left(replace(id::text, '-', ''), 10),
            updated_at = now()
      WHERE id = $1`, [userId]);
}
export async function isReservedName(value) {
    const res = await query(`SELECT 1 FROM reserved_names WHERE lower(reserved_value) = lower($1) LIMIT 1`, [value]);
    return res.rows.length > 0;
}
export async function getActivePolicyVersion(docType) {
    const res = await query(`SELECT version FROM policy_versions
      WHERE doc_type = $1
      ORDER BY published_at DESC NULLS LAST
      LIMIT 1`, [docType]);
    return res.rows[0]?.version ?? null;
}
export async function createUser(input, policyAcceptances) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const inserted = await client.query(`INSERT INTO users
         (username, email_hash, email_enc, signup_details_enc, password_hash,
          account_type, account_status, account_label, age_confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', 'new_user',
         CASE WHEN $7 THEN now() ELSE NULL END)
       RETURNING ${USER_COLUMNS}`, [
            input.username,
            input.emailHash,
            input.emailEnc,
            input.signupDetailsEnc,
            input.passwordHash,
            input.accountType,
            input.ageConfirmed,
        ]);
        const user = inserted.rows[0];
        if (!user)
            throw new Error('user insert returned no row');
        for (const acc of policyAcceptances) {
            await client.query(`INSERT INTO terms_acceptances (user_id, doc_type, version, accepted_at)
         VALUES ($1, $2, $3, now())`, [user.id, acc.docType, acc.version]);
        }
        await client.query('COMMIT');
        return user;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
export async function updatePasswordHash(userId, passwordHash) {
    await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
        passwordHash,
        userId,
    ]);
}
export async function createSession(input) {
    const res = await query(`INSERT INTO user_sessions
       (user_id, device, ip, user_agent, remember_me, expires_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id`, [
        input.userId,
        input.device,
        input.ip,
        input.userAgent,
        input.rememberMe,
        input.expiresAt.toISOString(),
    ]);
    const row = res.rows[0];
    if (!row)
        throw new Error('session insert returned no row');
    return row.id;
}
export async function touchSession(sessionId) {
    await query(`UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, [sessionId]);
}
export async function revokeSession(sessionId) {
    await query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [
        sessionId,
    ]);
}
export async function revokeAllSessions(userId) {
    await query(`UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}
export async function insertRefreshToken(input) {
    await query(`INSERT INTO auth_tokens
       (user_id, session_id, token_type, token_hash, jwt_id, audience, issued_at, expires_at)
     VALUES ($1, $2, 'refresh', $3, $4, $5, $6, $7)`, [
        input.userId,
        input.sessionId,
        input.tokenHash,
        input.jti,
        input.audience,
        input.issuedAt.toISOString(),
        input.expiresAt.toISOString(),
    ]);
}
export async function findRefreshToken(tokenHash) {
    const res = await query(`SELECT id, user_id, session_id, jwt_id, used_at, revoked_at, expires_at
       FROM auth_tokens
      WHERE token_hash = $1 AND token_type = 'refresh'
      LIMIT 1`, [tokenHash]);
    return res.rows[0] ?? null;
}
export async function markRefreshTokenConsumed(id) {
    await query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [id]);
}
export async function findRefreshTokenForUpdate(client, tokenHash) {
    const res = await client.query(`SELECT id, user_id, session_id, jwt_id, used_at, revoked_at, expires_at
       FROM auth_tokens
      WHERE token_hash = $1 AND token_type = 'refresh'
      FOR UPDATE`, [tokenHash]);
    return res.rows[0] ?? null;
}
export async function markRefreshTokenConsumedTx(client, id) {
    await client.query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [
        id,
    ]);
}
export async function revokeSessionTx(client, sessionId) {
    await client.query(`UPDATE user_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [sessionId]);
}
export async function listActiveRefreshTokens(userId) {
    const res = await query(`SELECT jwt_id, expires_at FROM auth_tokens
      WHERE user_id = $1 AND token_type = 'refresh'
        AND revoked_at IS NULL AND jwt_id IS NOT NULL`, [userId]);
    return res.rows;
}
export async function revokeAllRefreshTokens(userId) {
    await query(`UPDATE auth_tokens SET revoked_at = now()
      WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`, [userId]);
}
export async function recordSecurityEvent(input) {
    await query(`INSERT INTO account_security_events (user_id, event_type, ip, device, metadata)
     VALUES ($1, $2, $3, $4, $5)`, [
        input.userId,
        input.eventType,
        input.ip,
        input.device,
        input.metadata ? JSON.stringify(input.metadata) : null,
    ]);
}
export async function recordLoginAttempt(input) {
    await query(`INSERT INTO login_attempts (identifier_hash, ip, success) VALUES ($1, $2, $3)`, [
        input.identifierHash,
        input.ip,
        input.success,
    ]);
}
export async function hasActiveLockout(identifierHash) {
    const res = await query(`SELECT 1 FROM account_lockouts
      WHERE identifier_hash = $1 AND locked_until IS NOT NULL AND locked_until > now()
      LIMIT 1`, [identifierHash]);
    return res.rows.length > 0;
}
export async function insertSingleUseToken(input) {
    await query(`INSERT INTO auth_tokens (user_id, token_type, token_hash, issued_at, expires_at)
     VALUES ($1, $2, $3, now(), $4)`, [input.userId, input.tokenType, input.tokenHash, input.expiresAt.toISOString()]);
}
export async function findSingleUseToken(tokenHash, tokenType) {
    const res = await query(`SELECT id, user_id, token_type, used_at, revoked_at, expires_at
       FROM auth_tokens WHERE token_hash = $1 AND token_type = $2 LIMIT 1`, [tokenHash, tokenType]);
    return res.rows[0] ?? null;
}
export async function consumeSingleUseToken(id) {
    await query(`UPDATE auth_tokens SET used_at = now(), revoked_at = now() WHERE id = $1`, [id]);
}
export async function revokeSingleUseTokensOfType(userId, tokenType) {
    await query(`UPDATE auth_tokens SET revoked_at = now()
      WHERE user_id = $1 AND token_type = $2 AND revoked_at IS NULL AND used_at IS NULL`, [userId, tokenType]);
}
export async function insertStepUp(input) {
    const res = await query(`INSERT INTO step_up_confirmations (user_id, action_type, deal_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`, [input.userId, input.actionType, input.dealId, input.tokenHash, input.expiresAt.toISOString()]);
    const row = res.rows[0];
    if (!row)
        throw new Error('step_up insert returned no row');
    return row.id;
}
export async function findStepUp(tokenHash, actionType) {
    const res = await query(`SELECT id, user_id, action_type, deal_id, confirmed_at, expires_at
       FROM step_up_confirmations WHERE token_hash = $1 AND action_type = $2 LIMIT 1`, [tokenHash, actionType]);
    return res.rows[0] ?? null;
}
export async function confirmStepUp(id) {
    await query(`UPDATE step_up_confirmations SET confirmed_at = now() WHERE id = $1`, [id]);
}
// ===========================================================================
// Credential & recovery changes — task 3.7
// ===========================================================================
export async function updateEmail(userId, emailHash, emailEnc) {
    await query(`UPDATE users SET email_hash = $1, email_enc = $2, updated_at = now() WHERE id = $3`, [emailHash, emailEnc, userId]);
}
export async function setRecoveryEmail(userId, recoveryEmailHash, recoveryEmailEnc) {
    await query(`UPDATE users SET recovery_email_hash = $1, recovery_email_enc = $2, updated_at = now() WHERE id = $3`, [recoveryEmailHash, recoveryEmailEnc, userId]);
}
export async function findUserByRecoveryEmailHash(hash) {
    const res = await query(`SELECT ${USER_COLUMNS} FROM users WHERE recovery_email_hash = $1 LIMIT 1`, [hash]);
    return res.rows[0] ?? null;
}
// ===========================================================================
// Brute-force lockout (login_attempts / account_lockouts) — task 3.9
// ===========================================================================
export async function countRecentFailedAttempts(identifierHash, withinSeconds) {
    const res = await query(`SELECT count(*)::text AS n FROM login_attempts
      WHERE identifier_hash = $1 AND success = false
        AND created_at > now() - ($2 || ' seconds')::interval`, [identifierHash, String(withinSeconds)]);
    return Number(res.rows[0]?.n ?? '0');
}
export async function createLockout(input) {
    await query(`INSERT INTO account_lockouts (user_id, identifier_hash, reason, locked_until)
     VALUES ($1, $2, $3, $4)`, [input.userId, input.identifierHash, input.reason, input.lockedUntil.toISOString()]);
}
export async function listActiveSessions(userId) {
    const res = await query(`SELECT id, device, ip, user_agent, remember_me, last_seen_at, expires_at, revoked_at, created_at
       FROM user_sessions
      WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
      ORDER BY last_seen_at IS NULL, last_seen_at DESC`, [userId]);
    return res.rows;
}
export async function findSessionForUser(sessionId, userId) {
    const res = await query(`SELECT id, device, ip, user_agent, remember_me, last_seen_at, expires_at, revoked_at, created_at
       FROM user_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`, [sessionId, userId]);
    return res.rows[0] ?? null;
}
export async function revokeRefreshTokensForSession(sessionId) {
    const res = await query(`UPDATE auth_tokens SET revoked_at = now()
      WHERE session_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL AND jwt_id IS NOT NULL
      RETURNING jwt_id`, [sessionId]);
    return res.rows.map((r) => r.jwt_id);
}
export async function listSecurityEvents(userId, limit = 50) {
    const res = await query(`SELECT id, event_type, ip, device, created_at
       FROM account_security_events WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return res.rows;
}
// ===========================================================================
// Account deactivation & deletion — task 3.10
// ===========================================================================
export async function setAccountStatus(userId, status) {
    await query(`UPDATE users SET account_status = $1, updated_at = now() WHERE id = $2`, [
        status,
        userId,
    ]);
}
export async function getUserAccountFlags(userId) {
    const res = await query(`SELECT account_status, legal_hold FROM users WHERE id = $1 LIMIT 1`, [userId]);
    return res.rows[0] ?? null;
}
export async function countActiveDealsForUser(userId) {
    const res = await query(`SELECT count(*)::text AS n FROM deals
      WHERE (buyer_id = $1 OR seller_id = $1 OR middleman_id = $1)
        AND status NOT IN ('Cancelled', 'Released', 'Refunded', 'Expired')`, [userId]);
    return Number(res.rows[0]?.n ?? '0');
}
export async function insertDeactivation(userId, reason) {
    await query(`INSERT INTO account_deactivations (user_id, reason, deactivated_at) VALUES ($1, $2, now())`, [userId, reason]);
}
export async function markReactivated(userId) {
    await query(`UPDATE account_deactivations SET reactivated_at = now()
      WHERE user_id = $1 AND reactivated_at IS NULL`, [userId]);
}
export async function insertDeletionRequest(input) {
    const res = await query(`INSERT INTO account_deletion_requests (user_id, status, active_deal_count, user_notice, requested_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING id`, [input.userId, input.status, input.activeDealCount, input.userNotice]);
    const row = res.rows[0];
    if (!row)
        throw new Error('deletion request insert returned no row');
    return row.id;
}
export async function insertAccountDeletion(input) {
    await query(`INSERT INTO account_deletions (user_id, requested_by, reason, deletion_type, deleted_at)
     VALUES ($1, $2, $3, $4, now())`, [input.userId, input.requestedBy, input.reason, input.deletionType]);
}
export async function completeDeletionRequest(userId) {
    await query(`UPDATE account_deletion_requests SET status = 'completed', completed_at = now()
      WHERE user_id = $1 AND status <> 'completed'`, [userId]);
}
export async function countRecentRegistrationsByIp(ip, withinSeconds) {
    const res = await query(`SELECT count(*)::text AS n FROM account_security_events
      WHERE event_type = 'register' AND ip = $1
        AND created_at > now() - ($2 || ' seconds')::interval`, [ip, String(withinSeconds)]);
    return Number(res.rows[0]?.n ?? '0');
}
export async function acceptPolicy(userId, docType, version) {
    const check = await query(`SELECT 1 FROM terms_acceptances WHERE user_id = $1 AND doc_type = $2 AND version = $3 LIMIT 1`, [userId, docType, version]);
    if (check.rows.length === 0) {
        await query(`INSERT INTO terms_acceptances (user_id, doc_type, version, accepted_at)
       VALUES ($1, $2, $3, now())`, [userId, docType, version]);
    }
}
export async function updateTOTP(userId, secretEnc, enabled, backupCodesEnc) {
    await query(`UPDATE users
     SET totp_secret_enc = $2, totp_enabled = $3, totp_backup_codes_enc = $4, updated_at = now()
     WHERE id = $1`, [userId, secretEnc, enabled, backupCodesEnc]);
}
//# sourceMappingURL=auth.repository.js.map