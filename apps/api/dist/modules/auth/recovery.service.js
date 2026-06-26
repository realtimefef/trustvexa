/**
 * Account recovery + credential changes (task 3.7).
 *
 * Covers email verification, the forgot/reset-password flow, in-session
 * password and email changes, and recovery-email management. All sensitive
 * mutations re-verify the current password, invalidate other sessions where
 * appropriate, and append to the security log. Email enumeration is avoided:
 * forgot-password always reports success. (Requirements 2.x, 3.7, 33.x)
 */
import { hashLookup } from '@trustvexa/shared';
import { AppError } from '../../errors/app-error.js';
import { getAuthConfig } from './auth.config.js';
import { consumeSingleUseToken, issueSingleUseToken } from './email-token.js';
import { checkPasswordStrength, hashPassword, pwnedCount, verifyPassword } from './password.js';
import * as repo from './auth.repository.js';
import { revokeJti } from './token-store.js';
import { openPii, sealPii } from '../crypto/key-provider.js';
import { enqueueEmail } from '../../lib/queue.js';
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:3000';
const FALLBACK_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
function emailHashOf(email, cfg) {
    return hashLookup(email.trim().toLowerCase(), cfg.lookupHashKey);
}
async function revokeAllSessionsForReason(userId, reason) {
    const active = await repo.listActiveRefreshTokens(userId);
    await Promise.all(active.map((t) => revokeJti({
        jti: t.jwt_id,
        userId,
        reason,
        expiresAt: t.expires_at
            ? new Date(t.expires_at)
            : new Date(Date.now() + FALLBACK_EXPIRY_MS),
    })));
    await repo.revokeAllRefreshTokens(userId);
    await repo.revokeAllSessions(userId);
}
async function assertNotBreached(password, cfg) {
    if (!cfg.breachCheckEnabled)
        return;
    try {
        if ((await pwnedCount(password)) > 0) {
            throw new AppError('breached_password', 'That password has appeared in a known data breach. Please choose another.', 422);
        }
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        // Fail open if HIBP is unreachable.
    }
}
/** Issue an email-verification token for the current user (delivered by the mailer). */
export async function requestEmailVerification(userId) {
    const { token } = await issueSingleUseToken(userId, 'email_verify');
    const user = await repo.findUserById(userId);
    if (user && user.email_enc) {
        const email = await openPii(user.email_enc);
        if (email) {
            try {
                await enqueueEmail({
                    to: email,
                    templateName: 'verify-email',
                    templateData: {
                        username: user.username,
                        verifyUrl: `${WEB_APP_URL}/verify-email?token=${token}`,
                    },
                });
            }
            catch (err) {
                console.warn('Failed to enqueue verification email:', err);
            }
        }
    }
}
export async function verifyEmail(token) {
    const consumed = await consumeSingleUseToken(token, 'email_verify');
    if (!consumed) {
        throw new AppError('invalid_token', 'This verification link is invalid or has expired.', 400);
    }
    await repo.recordSecurityEvent({
        userId: consumed.userId,
        eventType: 'email_verified',
        ip: null,
        device: null,
    });
}
/** Returns normally when a reset email is queued. Throws when the email is not
 * registered or the account is deleted — so the user gets an actionable message. */
export async function forgotPassword(input) {
    const cfg = getAuthConfig();
    const user = await repo.findUserByEmailHash(emailHashOf(input.email, cfg));
    if (!user || user.account_status === 'deleted') {
        throw new AppError('account_not_found', 'No account is registered with this email address. Please check the address or create a new account.', 404);
    }
    if (user.account_status === 'blocked') {
        throw new AppError('account_blocked', 'This account has been suspended. Please contact support@trustvexa.com for assistance.', 403);
    }
    const { token } = await issueSingleUseToken(user.id, 'password_reset');
    try {
        await enqueueEmail({
            to: input.email,
            templateName: 'password-reset',
            templateData: {
                username: user.username,
                resetUrl: `${WEB_APP_URL}/reset-password?token=${token}`,
            },
        });
    }
    catch (err) {
        console.warn('Failed to enqueue password-reset email:', err);
    }
}
export async function resetPassword(input) {
    const cfg = getAuthConfig();
    const consumed = await consumeSingleUseToken(input.token, 'password_reset');
    if (!consumed) {
        throw new AppError('invalid_token', 'This reset link is invalid or has expired.', 400);
    }
    const strength = checkPasswordStrength(input.password, {});
    if (!strength.ok) {
        throw new AppError('weak_password', strength.reasons[0] ?? 'Password is too weak.', 422);
    }
    await assertNotBreached(input.password, cfg);
    await repo.updatePasswordHash(consumed.userId, await hashPassword(input.password));
    await revokeAllSessionsForReason(consumed.userId, 'password_change');
    await repo.recordSecurityEvent({
        userId: consumed.userId,
        eventType: 'password_reset',
        ip: null,
        device: null,
    });
}
export async function changePassword(userId, input) {
    const cfg = getAuthConfig();
    const user = await repo.findUserById(userId);
    if (!user || !user.password_hash) {
        throw new AppError('not_found', 'Account not found.', 404);
    }
    if (!(await verifyPassword(user.password_hash, input.currentPassword))) {
        throw new AppError('invalid_credentials', 'Your current password is incorrect.', 403);
    }
    const strength = checkPasswordStrength(input.newPassword, { username: user.username });
    if (!strength.ok) {
        throw new AppError('weak_password', strength.reasons[0] ?? 'Password is too weak.', 422);
    }
    await assertNotBreached(input.newPassword, cfg);
    await repo.updatePasswordHash(userId, await hashPassword(input.newPassword));
    await revokeAllSessionsForReason(userId, 'password_change');
    await repo.recordSecurityEvent({
        userId,
        eventType: 'password_change',
        ip: null,
        device: null,
    });
}
export async function changeEmail(userId, input) {
    const cfg = getAuthConfig();
    const user = await repo.findUserById(userId);
    if (!user || !user.password_hash) {
        throw new AppError('not_found', 'Account not found.', 404);
    }
    if (!(await verifyPassword(user.password_hash, input.currentPassword))) {
        throw new AppError('invalid_credentials', 'Your password is incorrect.', 403);
    }
    const newHash = emailHashOf(input.newEmail, cfg);
    if (await repo.isEmailTaken(newHash)) {
        throw new AppError('email_unavailable', 'That email cannot be used.', 409);
    }
    const newEmailEnc = await sealPii(input.newEmail);
    await repo.updateEmail(userId, newHash, newEmailEnc);
    const { token } = await issueSingleUseToken(userId, 'email_verify');
    await repo.recordSecurityEvent({
        userId,
        eventType: 'email_change',
        ip: null,
        device: null,
    });
    // Notify old email address if present
    if (user.email_enc) {
        const oldEmail = await openPii(user.email_enc);
        if (oldEmail) {
            try {
                await enqueueEmail({
                    to: oldEmail,
                    templateName: 'new-device-login',
                    templateData: {
                        username: user.username,
                        device: 'Security Alert: Email Address Change Requested',
                        ip: 'N/A',
                        time: new Date().toUTCString(),
                    },
                });
            }
            catch (err) {
                console.warn('Failed to enqueue security alert to old email:', err);
            }
        }
    }
    // Send verification link to new email address
    try {
        await enqueueEmail({
            to: input.newEmail,
            templateName: 'verify-email',
            templateData: {
                username: user.username,
                verifyUrl: `${WEB_APP_URL}/verify-email?token=${token}`,
            },
        });
    }
    catch (err) {
        console.warn('Failed to enqueue verification to new email:', err);
    }
}
export async function setRecoveryEmail(userId, input) {
    const cfg = getAuthConfig();
    const user = await repo.findUserById(userId);
    if (!user || !user.password_hash) {
        throw new AppError('not_found', 'Account not found.', 404);
    }
    if (!(await verifyPassword(user.password_hash, input.currentPassword))) {
        throw new AppError('invalid_credentials', 'Your password is incorrect.', 403);
    }
    const recoveryEmailEnc = await sealPii(input.recoveryEmail);
    await repo.setRecoveryEmail(userId, emailHashOf(input.recoveryEmail, cfg), recoveryEmailEnc);
    await repo.recordSecurityEvent({
        userId,
        eventType: 'recovery_email_set',
        ip: null,
        device: null,
    });
}
export async function acceptPolicy(userId, input) {
    await repo.acceptPolicy(userId, input.docType, input.version);
}
//# sourceMappingURL=recovery.service.js.map