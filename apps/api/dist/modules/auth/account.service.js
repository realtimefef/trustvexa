/**
 * Account deactivation, reactivation, and deletion (task 3.10).
 *
 * Deactivation is reversible and simply parks the account + cuts sessions.
 * Deletion is gated: it is refused while a legal hold is in place, and it is
 * held pending while the user still has active deals. A clean deletion records
 * an audit row (audit_retained = true) and blocks further access.
 * (Requirements 3.10, 13.x, legal-hold rules)
 */
import { AppError } from '../../errors/app-error.js';
import * as repo from './auth.repository.js';
import { verifyPassword } from './password.js';
import { revokeJti } from './token-store.js';
const FALLBACK_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
async function revokeEverything(userId, reason) {
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
async function requirePassword(userId, password) {
    const user = await repo.findUserById(userId);
    if (!user || !user.password_hash) {
        throw new AppError('not_found', 'Account not found.', 404);
    }
    if (!(await verifyPassword(user.password_hash, password))) {
        throw new AppError('invalid_credentials', 'Your password is incorrect.', 403);
    }
    return user;
}
export async function deactivate(userId, password, reason) {
    const user = await requirePassword(userId, password);
    if (user.account_status === 'deleted') {
        throw new AppError('account_unavailable', 'This account is not available.', 403);
    }
    await repo.setAccountStatus(userId, 'deactivated');
    await repo.insertDeactivation(userId, reason);
    await revokeEverything(userId, 'logout_all');
    await repo.recordSecurityEvent({
        userId,
        eventType: 'account_deactivated',
        ip: null,
        device: null,
    });
}
export async function reactivate(userId) {
    const flags = await repo.getUserAccountFlags(userId);
    if (!flags) {
        throw new AppError('not_found', 'Account not found.', 404);
    }
    if (flags.account_status !== 'deactivated') {
        throw new AppError('invalid_state', 'Only a deactivated account can be reactivated.', 409);
    }
    await repo.setAccountStatus(userId, 'active');
    await repo.markReactivated(userId);
    await repo.recordSecurityEvent({
        userId,
        eventType: 'account_reactivated',
        ip: null,
        device: null,
    });
}
export async function requestDeletion(userId, password, reason) {
    await requirePassword(userId, password);
    const flags = await repo.getUserAccountFlags(userId);
    if (flags?.legal_hold) {
        throw new AppError('legal_hold', 'This account is under a legal hold and cannot be deleted.', 423);
    }
    const activeDealCount = await repo.countActiveDealsForUser(userId);
    if (activeDealCount > 0) {
        await repo.insertDeletionRequest({
            userId,
            status: 'pending_open_deals',
            activeDealCount,
            userNotice: 'Deletion is blocked until all active deals are resolved.',
        });
        return { status: 'pending', activeDealCount };
    }
    await repo.insertDeletionRequest({
        userId,
        status: 'completed',
        activeDealCount: 0,
        userNotice: reason,
    });
    await repo.insertAccountDeletion({
        userId,
        requestedBy: userId,
        reason,
        deletionType: 'user_requested',
    });
    await repo.setAccountStatus(userId, 'deleted');
    await repo.completeDeletionRequest(userId);
    await revokeEverything(userId, 'blocked');
    await repo.recordSecurityEvent({
        userId,
        eventType: 'account_deleted',
        ip: null,
        device: null,
    });
    return { status: 'completed', activeDealCount: 0 };
}
//# sourceMappingURL=account.service.js.map