/**
 * Critical-setting-change service (task 7.3). Drives the audited change
 * pipeline on top of the pure rules in `enforcement.ts`: a change is validated
 * (reason + a real diff), previewed, and — for critical keys — enters a cooldown
 * before it can be applied; applied changes are rollback-able, and the full
 * change history is the audit trail. Every write runs in a transaction. Values
 * live in the `*_enc` columns (envelope encryption is wired in a later task;
 * until then they are stored and returned as-is). (Requirements 34.1-34.5)
 */
import { getClient } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { canApplyChange, canRollback, planSettingChange, } from '../dashboard/enforcement.js';
import { getChangeById, listChanges, markApplied, markRolledBack, requestChange, } from '../dashboard/admin-setting.repository.js';
function toView(row) {
    return {
        id: row.id,
        settingKey: row.setting_key,
        reason: row.reason,
        status: row.status,
        oldValue: row.old_value_enc,
        newValue: row.new_value_enc,
        cooldownUntil: row.cooldown_until,
        appliedAt: row.applied_at,
        rollbackAt: row.rollback_at,
        createdAt: row.created_at,
    };
}
function cooldownElapsed(cooldownUntil) {
    return cooldownUntil === null || new Date(cooldownUntil).getTime() <= Date.now();
}
/** Validate, preview, and persist a requested change (cooling down if critical). */
export async function requestSettingChange(actorId, input) {
    const plan = planSettingChange({
        settingKey: input.settingKey,
        reason: input.reason,
        oldValue: input.oldValue,
        newValue: input.newValue,
    });
    if (!plan.ok) {
        const message = plan.error === 'no_change'
            ? 'The new value must differ from the current value.'
            : 'A reason is required for this setting change.';
        throw new AppError(plan.error ?? 'invalid_setting_change', message, 422);
    }
    const cooldownUntil = plan.requiresCooldown
        ? new Date(Date.now() + plan.cooldownMinutes * 60_000).toISOString()
        : null;
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const row = await requestChange(client, {
            actorId,
            settingKey: input.settingKey,
            oldValueEnc: input.oldValue,
            newValueEnc: input.newValue,
            reason: input.reason,
            cooldownUntil,
        });
        await client.query('COMMIT');
        return toView(row);
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Apply a pending/cooling-down change once its cooldown has elapsed. */
export async function applySettingChange(changeId) {
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const existing = await getChangeById(client, changeId);
        if (!existing) {
            throw notFound('Setting change was not found.');
        }
        const elapsed = cooldownElapsed(existing.cooldown_until);
        if (!canApplyChange(existing.status, elapsed)) {
            const message = existing.status === 'cooling_down' && !elapsed
                ? 'This change is still within its cooldown window and cannot be applied yet.'
                : 'This change can no longer be applied.';
            throw new AppError('apply_not_allowed', message, 409);
        }
        const applied = await markApplied(client, changeId);
        if (!applied) {
            throw new AppError('apply_conflict', 'The setting change could not be applied because its state changed.', 409);
        }
        const updated = await getChangeById(client, changeId);
        await client.query('COMMIT');
        return toView(updated ?? existing);
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Roll back a previously applied change. */
export async function rollbackSettingChange(changeId) {
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const existing = await getChangeById(client, changeId);
        if (!existing) {
            throw notFound('Setting change was not found.');
        }
        if (!canRollback(existing.status)) {
            throw new AppError('rollback_not_allowed', 'Only an applied change can be rolled back.', 409);
        }
        const rolled = await markRolledBack(client, changeId);
        if (!rolled) {
            throw new AppError('rollback_conflict', 'The setting change could not be rolled back because its state changed.', 409);
        }
        const updated = await getChangeById(client, changeId);
        await client.query('COMMIT');
        return toView(updated ?? existing);
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Full audit history for a setting key, newest first. */
export async function listSettingChanges(settingKey) {
    const client = (await getClient());
    try {
        const rows = await listChanges(client, settingKey);
        return { settingKey, changes: rows.map(toView) };
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=admin-setting.service.js.map