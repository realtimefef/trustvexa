/**
 * Auth service (tasks 3.1, 3.2, 3.4, 3.5).
 *
 * Orchestrates registration, login, refresh rotation, and logout on top of the
 * password primitives, JWT issuer, token denylist, and repository. Money/role
 * trust is server-side only: the role baked into a token always comes from
 * `users.account_type`, never from client input. (Requirements 1.x, 2.x, 3.x)
 */
import { hashLookup, getClient } from '@trustvexa/shared';
import { AppError } from '../../errors/app-error.js';
import { getAuthConfig } from './auth.config.js';
import { issueAccessToken, issueRefreshToken, verifyRefreshToken, } from './jwt.js';
import { checkPasswordStrength, hashPassword, needsRehash, pwnedCount, verifyPassword, } from './password.js';
import * as repo from './auth.repository.js';
import { hashToken, isJtiRevoked, revokeJti } from './token-store.js';
import { resolveGoogleUser } from './google-oauth.service.js';
import { checkFailedLoginAbuse } from '../../lib/abuse-detector.js';
import { sealPii } from '../crypto/key-provider.js';
import { enqueueEmail } from '../../lib/queue.js';
const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
// Brute-force lockout policy (task 3.9, Requirements 33.1–33.3).
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_WINDOW_SECONDS = 15 * 60;
const LOCKOUT_MS = 15 * 60 * 1000;
/**
 * After a failed login, create a temporary lockout once the recent-failure
 * count for an identifier crosses the threshold. Repeated failures extend the
 * lockout window; the limiter (slot 8) and `hasActiveLockout` enforce it.
 */
async function maybeLockout(identifierHash) {
    const failures = await repo.countRecentFailedAttempts(identifierHash, FAILED_WINDOW_SECONDS);
    if (failures >= MAX_FAILED_ATTEMPTS) {
        await repo.createLockout({
            userId: null,
            identifierHash,
            reason: 'too_many_failed_logins',
            lockedUntil: new Date(Date.now() + LOCKOUT_MS),
        });
    }
}
function emailHashOf(email, cfg) {
    return hashLookup(email.trim().toLowerCase(), cfg.lookupHashKey);
}
function toPublicUser(u) {
    return {
        id: u.id,
        username: u.username,
        role: u.account_type,
        accountStatus: u.account_status,
        accountLabel: u.account_label,
        totpEnabled: u.totp_enabled ?? false,
    };
}
async function establishSession(user, meta, rememberMe, cfg) {
    const sessionExpiry = new Date(Date.now() + (rememberMe ? REMEMBER_ME_MS : DEFAULT_SESSION_MS));
    const sessionId = await repo.createSession({
        userId: user.id,
        device: meta.userAgent,
        ip: meta.ip,
        userAgent: meta.userAgent,
        rememberMe,
        expiresAt: sessionExpiry,
    });
    const access = issueAccessToken({ userId: user.id, role: user.account_type, sessionId }, cfg);
    const refresh = issueRefreshToken({ userId: user.id, sessionId }, cfg);
    await repo.insertRefreshToken({
        userId: user.id,
        sessionId,
        tokenHash: hashToken(refresh.token),
        jti: refresh.jti,
        audience: cfg.audience,
        issuedAt: new Date(),
        expiresAt: refresh.expiresAt,
    });
    return {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken: refresh.token,
        refreshExpiresAt: refresh.expiresAt,
    };
}
export async function register(input, meta) {
    const cfg = getAuthConfig();
    const email = input.email.trim().toLowerCase();
    const emailHash = emailHashOf(email, cfg);
    if (await repo.isReservedName(input.username)) {
        throw new AppError('reserved_username', 'That username is not available.', 409);
    }
    if (await repo.isUsernameTaken(input.username)) {
        throw new AppError('username_taken', 'That username is already taken.', 409);
    }
    if (await repo.isEmailTaken(emailHash)) {
        // Generic code/message to avoid account enumeration.
        throw new AppError('email_unavailable', 'That email cannot be used to register.', 409);
    }
    const strength = checkPasswordStrength(input.password, { email, username: input.username });
    if (!strength.ok) {
        throw new AppError('weak_password', strength.reasons[0] ?? 'Password is too weak.', 422);
    }
    if (cfg.breachCheckEnabled) {
        try {
            if ((await pwnedCount(input.password)) > 0) {
                throw new AppError('breached_password', 'That password has appeared in a known data breach. Please choose another.', 422);
            }
        }
        catch (err) {
            if (err instanceof AppError) {
                throw err;
            }
            // Fail open: never block a legitimate signup because HIBP is unreachable.
        }
    }
    const emailEnc = await sealPii(email);
    const passwordHash = await hashPassword(input.password);
    // NOTE: email_enc / signup_details_enc are envelope-encrypted PII columns.
    // They are populated once the encryption_key_versions KeyProvider + master
    // KEK (operator secret TRUSTVEXA_MASTER_KEK) are wired at runtime. Until then
    // only the non-sensitive email_hash is persisted for lookup + uniqueness.
    const acceptances = await Promise.all(['terms', 'privacy'].map(async (docType) => ({
        docType,
        version: (await repo.getActivePolicyVersion(docType)) ?? 'v1',
    })));
    const user = await repo.createUser({
        username: input.username,
        emailHash,
        emailEnc,
        signupDetailsEnc: null,
        passwordHash,
        accountType: 'user',
        ageConfirmed: input.isAdult,
    }, acceptances);
    await repo.recordSecurityEvent({
        userId: user.id,
        eventType: 'register',
        ip: meta.ip,
        device: meta.userAgent,
    });
    // Enqueue welcome email (Requirement 31-33)
    try {
        const webAppUrl = (process.env.WEB_APP_URL ?? 'https://trustvexa.com').replace(/\/$/, '');
        await enqueueEmail({
            to: email,
            templateName: 'welcome',
            templateData: {
                username: input.username,
                loginUrl: `${webAppUrl}/dashboard`,
                unsubscribeUrl: `${webAppUrl}/settings`,
            },
        });
    }
    catch (err) {
        console.warn('Failed to enqueue welcome email:', err);
    }
    const tokens = await establishSession(user, meta, input.rememberMe ?? false, cfg);
    return { user: toPublicUser(user), tokens };
}
export async function login(input, meta) {
    const cfg = getAuthConfig();
    const email = input.email.trim().toLowerCase();
    const emailHash = emailHashOf(email, cfg);
    if (await repo.hasActiveLockout(emailHash)) {
        throw new AppError('account_locked', 'Too many attempts. Please try again later.', 429);
    }
    const user = await repo.findUserByEmailHash(emailHash);
    const passwordOk = user?.password_hash != null && (await verifyPassword(user.password_hash, input.password));
    await repo.recordLoginAttempt({ identifierHash: emailHash, ip: meta.ip, success: passwordOk });
    if (!user || !passwordOk) {
        await maybeLockout(emailHash);
        await checkFailedLoginAbuse(meta.ip ?? 'unknown', email);
        // Single generic error for unknown email and wrong password alike.
        throw new AppError('invalid_credentials', 'Invalid email or password.', 401);
    }
    if (user.account_status === 'blocked' || user.account_status === 'deleted') {
        throw new AppError('account_unavailable', 'This account is not available.', 403);
    }
    if (user.password_hash && needsRehash(user.password_hash)) {
        try {
            await repo.updatePasswordHash(user.id, await hashPassword(input.password));
        }
        catch {
            // Best-effort transparent rehash; login still succeeds on failure.
        }
    }
    await repo.recordSecurityEvent({
        userId: user.id,
        eventType: 'login',
        ip: meta.ip,
        device: meta.userAgent,
    });
    if (user.totp_enabled) {
        return { totp_required: true, email };
    }
    const tokens = await establishSession(user, meta, input.rememberMe ?? false, cfg);
    return { user: toPublicUser(user), tokens };
}
export async function verifyTOTPAndLogin(input, meta) {
    const cfg = getAuthConfig();
    const email = input.email.trim().toLowerCase();
    const emailHash = emailHashOf(email, cfg);
    // SEC-HIGH-2 FIX: Check lockout at the TOTP step — without this, an attacker
    // who triggered CAPTCHA on step 1 via bad passwords could bypass brute-force
    // protection by moving directly to the TOTP step.
    if (await repo.hasActiveLockout(emailHash)) {
        throw new AppError('account_locked', 'Too many attempts. Please try again later.', 429);
    }
    // Also apply CAPTCHA threshold at TOTP step so multi-step bypass is impossible.
    const totpFailures = await repo.countRecentFailedAttempts(emailHash, FAILED_WINDOW_SECONDS);
    if (totpFailures >= MAX_FAILED_ATTEMPTS) {
        await repo.createLockout({
            userId: null,
            identifierHash: emailHash,
            reason: 'too_many_totp_attempts',
            lockedUntil: new Date(Date.now() + LOCKOUT_MS),
        });
        throw new AppError('account_locked', 'Too many attempts. Please try again later.', 429);
    }
    const user = await repo.findUserByEmailHash(emailHash);
    const passwordOk = user?.password_hash != null && (await verifyPassword(user.password_hash, input.password));
    await repo.recordLoginAttempt({ identifierHash: emailHash, ip: meta.ip, success: passwordOk });
    if (!user || !passwordOk) {
        await maybeLockout(emailHash);
        await checkFailedLoginAbuse(meta.ip ?? 'unknown', email);
        throw new AppError('invalid_credentials', 'Invalid email or password.', 401);
    }
    if (user.account_status === 'blocked' || user.account_status === 'deleted') {
        throw new AppError('account_unavailable', 'This account is not available.', 403);
    }
    const totpService = await import('./totp.service.js');
    const totpOk = await totpService.verifyTOTPLogin(user.id, input.code);
    if (!totpOk) {
        // Record the failed TOTP attempt so lockout thresholds are enforced.
        await repo.recordLoginAttempt({ identifierHash: emailHash, ip: meta.ip, success: false });
        await maybeLockout(emailHash);
        throw new AppError('invalid_credentials', 'Invalid 2FA verification code.', 401);
    }
    await repo.recordSecurityEvent({
        userId: user.id,
        eventType: 'login_2fa',
        ip: meta.ip,
        device: meta.userAgent,
    });
    const tokens = await establishSession(user, meta, input.rememberMe ?? false, cfg);
    return { user: toPublicUser(user), tokens };
}
export async function refresh(refreshToken, _meta) {
    const cfg = getAuthConfig();
    let claims;
    try {
        claims = verifyRefreshToken(refreshToken, cfg);
    }
    catch {
        throw new AppError('invalid_token', 'Refresh token is invalid or expired.', 401);
    }
    const expiresAt = new Date(claims.exp * 1000);
    if (await isJtiRevoked(claims.jti)) {
        throw new AppError('token_revoked', 'Refresh token has been revoked.', 401);
    }
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const record = await repo.findRefreshTokenForUpdate(client, hashToken(refreshToken));
        if (!record || record.revoked_at || record.used_at) {
            // Reuse of a consumed/unknown refresh token: revoke the session defensively.
            if (record?.session_id) {
                await repo.revokeSessionTx(client, record.session_id);
            }
            await revokeJti({ jti: claims.jti, userId: claims.sub, reason: 'rotation', expiresAt });
            await client.query('COMMIT');
            throw new AppError('token_revoked', 'Refresh token has already been used or revoked.', 401);
        }
        const user = await repo.findUserById(claims.sub);
        if (!user || user.account_status === 'blocked' || user.account_status === 'deleted') {
            await client.query('ROLLBACK');
            throw new AppError('account_unavailable', 'This account is not available.', 403);
        }
        // Rotation: consume + denylist the old refresh token, then mint a new pair.
        await repo.markRefreshTokenConsumedTx(client, record.id);
        await revokeJti({ jti: claims.jti, userId: claims.sub, reason: 'rotation', expiresAt });
        await client.query(`UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, [claims.sid]);
        const access = issueAccessToken({ userId: user.id, role: user.account_type, sessionId: claims.sid }, cfg);
        const newRefresh = issueRefreshToken({ userId: user.id, sessionId: claims.sid }, cfg);
        await client.query(`INSERT INTO auth_tokens
         (user_id, session_id, token_type, token_hash, jwt_id, audience, issued_at, expires_at)
       VALUES ($1, $2, 'refresh', $3, $4, $5, now(), $6)`, [
            user.id,
            claims.sid,
            hashToken(newRefresh.token),
            newRefresh.jti,
            cfg.audience,
            newRefresh.expiresAt.toISOString(),
        ]);
        await client.query('COMMIT');
        return {
            user: toPublicUser(user),
            tokens: {
                accessToken: access.token,
                accessExpiresAt: access.expiresAt,
                refreshToken: newRefresh.token,
                refreshExpiresAt: newRefresh.expiresAt,
            },
        };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Verify that a refresh token is valid and the session is active, WITHOUT
 * rotating/consuming the token.  Used by the Next.js middleware for
 * non-destructive auth checks so that client-side token rotation still works.
 */
export async function verifySession(refreshToken) {
    const cfg = getAuthConfig();
    let claims;
    try {
        claims = verifyRefreshToken(refreshToken, cfg);
    }
    catch {
        throw new AppError('invalid_token', 'Session is invalid or expired.', 401);
    }
    if (await isJtiRevoked(claims.jti)) {
        throw new AppError('token_revoked', 'Session has been revoked.', 401);
    }
    const record = await repo.findRefreshToken(hashToken(refreshToken));
    if (!record || record.revoked_at || record.used_at) {
        throw new AppError('token_revoked', 'Session has expired or been revoked.', 401);
    }
    const user = await repo.findUserById(claims.sub);
    if (!user || user.account_status === 'blocked' || user.account_status === 'deleted') {
        throw new AppError('account_unavailable', 'This account is not available.', 403);
    }
    return toPublicUser(user);
}
export async function logout(refreshToken, accessJti, accessExp) {
    const cfg = getAuthConfig();
    if (refreshToken) {
        try {
            const claims = verifyRefreshToken(refreshToken, cfg);
            await revokeJti({
                jti: claims.jti,
                userId: claims.sub,
                reason: 'logout',
                expiresAt: new Date(claims.exp * 1000),
            });
            const record = await repo.findRefreshToken(hashToken(refreshToken));
            if (record) {
                await repo.markRefreshTokenConsumed(record.id);
                if (record.session_id) {
                    await repo.revokeSession(record.session_id);
                }
            }
        }
        catch {
            // Invalid/expired refresh token on logout is a no-op.
        }
    }
    if (accessJti && accessExp) {
        await revokeJti({
            jti: accessJti,
            userId: null,
            reason: 'logout',
            expiresAt: new Date(accessExp * 1000),
        });
    }
}
export async function logoutAll(userId) {
    const active = await repo.listActiveRefreshTokens(userId);
    await Promise.all(active.map((t) => revokeJti({
        jti: t.jwt_id,
        userId,
        reason: 'logout_all',
        expiresAt: t.expires_at ? new Date(t.expires_at) : new Date(Date.now() + REMEMBER_ME_MS),
    })));
    await repo.revokeAllRefreshTokens(userId);
    await repo.revokeAllSessions(userId);
    await repo.recordSecurityEvent({ userId, eventType: 'logout_all', ip: null, device: null });
}
/**
 * Google OAuth login (task 3.3, Requirement 2.2). Resolves the Google identity
 * to a local user (login / link / create) and opens a session using the exact
 * same `establishSession` flow as password login, so the resulting tokens and
 * cookies are identical.
 */
export async function loginWithGoogle(args, meta) {
    const cfg = getAuthConfig();
    const { user, isNewAccount } = await resolveGoogleUser(args);
    if (user.account_status === 'blocked' || user.account_status === 'deleted') {
        throw new AppError('account_unavailable', 'This account is not available.', 403);
    }
    await repo.recordSecurityEvent({
        userId: user.id,
        eventType: 'login',
        ip: meta.ip,
        device: meta.userAgent,
    });
    const tokens = await establishSession(user, meta, false, cfg);
    return { user: toPublicUser(user), tokens, isNewAccount };
}
//# sourceMappingURL=auth.service.js.map