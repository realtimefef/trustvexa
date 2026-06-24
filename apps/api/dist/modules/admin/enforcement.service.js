/**
 * Middleman enforcement service (task 7.3). Block / restrict / trust-downgrade
 * actions, each requiring a reason and each writing a hash-chained
 * `admin_actions` audit row in the same transaction as the state change, so an
 * enforcement action is always accountable and tamper-evident. The caller's
 * middleman identity comes from the verified JWT; the route chain restricts
 * these endpoints to the `middleman` role. (Requirements 39.1-39.9, 21.x)
 */
import { getClient } from '@trustvexa/shared';
import { AppError } from '../../errors/app-error.js';
import { ACCOUNT_LABELS } from './enforcement.constants.js';
import { appendAdminAction, applyTrustChange, insertUserBlock, insertWarningNotice, lockUser, setAccountLabel, setAccountStatus, } from './enforcement.repository.js';
async function inTransaction(work) {
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Block a user from the platform (audited). Already-blocked is idempotent. */
export async function blockUser(input) {
    if (input.targetUserId === input.actorId) {
        throw new AppError('cannot_block_self', 'A middleman cannot block their own account.', 422);
    }
    return inTransaction(async (tx) => {
        const user = await lockUser(tx, input.targetUserId);
        if (user === null)
            throw new AppError('user_not_found', 'User was not found.', 404);
        if (user.account_status !== 'blocked') {
            await insertUserBlock(tx, {
                blockerId: input.actorId,
                blockedUserId: input.targetUserId,
                reason: input.reason,
            });
            await setAccountStatus(tx, input.targetUserId, 'blocked');
            // Log the blocked user out everywhere (revoke sessions + refresh tokens).
            await tx.query(`UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [input.targetUserId]);
            await tx.query(`UPDATE auth_tokens SET revoked_at = now() WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`, [input.targetUserId]);
        }
        const auditId = await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'block_user',
            targetType: 'user',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { previousStatus: user.account_status },
        });
        return { userId: input.targetUserId, action: 'block_user', accountStatus: 'blocked', auditId };
    });
}
/** Lift a block / review hold, returning the user to active status (audited). */
export async function unblockUser(input) {
    return inTransaction(async (tx) => {
        const user = await lockUser(tx, input.targetUserId);
        if (user === null)
            throw new AppError('user_not_found', 'User was not found.', 404);
        if (user.account_status === 'deleted') {
            throw new AppError('account_deleted', 'A deleted account is permanent and cannot be restored.', 409);
        }
        if (user.account_status !== 'active') {
            await setAccountStatus(tx, input.targetUserId, 'active');
        }
        const auditId = await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'unblock_user',
            targetType: 'user',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { previousStatus: user.account_status },
        });
        return { userId: input.targetUserId, action: 'unblock_user', accountStatus: 'active', auditId };
    });
}
/** Set a user's account label (trust/limit tier), audited. */
export async function setUserLabel(input) {
    if (!ACCOUNT_LABELS.includes(input.label)) {
        throw new AppError('invalid_account_label', 'Unknown account label.', 422);
    }
    return inTransaction(async (tx) => {
        const user = await lockUser(tx, input.targetUserId);
        if (user === null)
            throw new AppError('user_not_found', 'User was not found.', 404);
        await setAccountLabel(tx, input.targetUserId, input.label);
        const auditId = await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'set_account_label',
            targetType: 'user',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { from: user.account_label, to: input.label },
        });
        return {
            userId: input.targetUserId,
            action: 'set_account_label',
            accountLabel: input.label,
            auditId,
        };
    });
}
/** Lower a user's trust level by a positive amount (audited + warning notice). */
export async function downgradeTrust(input) {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new AppError('invalid_amount', 'Downgrade amount must be a positive integer.', 422);
    }
    return inTransaction(async (tx) => {
        const user = await lockUser(tx, input.targetUserId);
        if (user === null)
            throw new AppError('user_not_found', 'User was not found.', 404);
        const trustLevel = await applyTrustChange(tx, {
            userId: input.targetUserId,
            change: -input.amount,
            reason: input.reason,
        });
        await insertWarningNotice(tx, {
            userId: input.targetUserId,
            warningType: 'trust_downgrade',
            message: input.reason,
        });
        const auditId = await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'trust_downgrade',
            targetType: 'user',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { amount: input.amount, newTrustLevel: trustLevel },
        });
        return { userId: input.targetUserId, action: 'trust_downgrade', trustLevel, auditId };
    });
}
/** Permanently delete a user from the platform (soft-delete status 'deleted', audited). */
export async function deleteUser(input) {
    if (input.targetUserId === input.actorId) {
        throw new AppError('cannot_delete_self', 'An admin cannot delete their own account.', 422);
    }
    return inTransaction(async (tx) => {
        const user = await lockUser(tx, input.targetUserId);
        if (user === null)
            throw new AppError('user_not_found', 'User was not found.', 404);
        if (user.account_status !== 'deleted') {
            await tx.query(`INSERT INTO account_deletions (user_id, requested_by, reason, deletion_type, deleted_at)
         VALUES ($1, $2, $3, 'admin_enforced', now())`, [input.targetUserId, input.actorId, input.reason]);
            await setAccountStatus(tx, input.targetUserId, 'deleted');
            // Scrub personal data — a deleted account leaves nothing personal behind.
            // (Deal / ledger / audit rows are retained as legally required, but they
            // reference only the opaque user id, never PII.) Both email lookup hashes
            // are cleared so the same email address can be used to register again.
            await tx.query(`UPDATE users
            SET email_enc = NULL, recovery_email_enc = NULL,
                email_hash = NULL, recovery_email_hash = NULL,
                username = 'deleted_' || left(replace(id::text, '-', ''), 10),
                updated_at = now()
          WHERE id = $1`, [input.targetUserId]);
            // Cut off all access and archive the user's live conversations.
            await tx.query(`UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [input.targetUserId]);
            await tx.query(`UPDATE auth_tokens SET revoked_at = now() WHERE user_id = $1 AND token_type = 'refresh' AND revoked_at IS NULL`, [input.targetUserId]);
            await tx.query(`UPDATE connections SET status = 'closed', updated_at = now() WHERE (creator_id = $1 OR joiner_id = $1 OR middleman_id = $1) AND status = 'open'`, [input.targetUserId]);
        }
        const auditId = await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'delete_user',
            targetType: 'user',
            targetId: input.targetUserId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { previousStatus: user.account_status },
        });
        return { userId: input.targetUserId, action: 'delete_user', accountStatus: 'deleted', auditId };
    });
}
//# sourceMappingURL=enforcement.service.js.map