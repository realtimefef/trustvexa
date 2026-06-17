// Persistence for the audited critical-setting-change pipeline (task 7.3).
// Values are stored encrypted; the full change history is the audit trail.
// Not barrel-exported.
export async function requestChange(tx, input) {
    const status = input.cooldownUntil ? 'cooling_down' : 'pending';
    const { rows } = await tx.query(`INSERT INTO admin_setting_changes
		   (actor_id, setting_key, old_value_enc, new_value_enc, reason, status, cooldown_until)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, actor_id, setting_key, old_value_enc, new_value_enc, reason,
		          status, cooldown_until, applied_at, rollback_at, created_at`, [
        input.actorId,
        input.settingKey,
        input.oldValueEnc,
        input.newValueEnc,
        input.reason,
        status,
        input.cooldownUntil,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('requestChange returned no row');
    return row;
}
/** Mark a change applied only if it is past any cooldown window. */
export async function markApplied(tx, changeId) {
    const { rowCount } = await tx.query(`UPDATE admin_setting_changes
		 SET status = 'applied', applied_at = now()
		 WHERE id = $1
		   AND status IN ('pending', 'cooling_down')
		   AND (cooldown_until IS NULL OR cooldown_until <= now())`, [changeId]);
    return (rowCount ?? 0) > 0;
}
export async function markRolledBack(tx, changeId) {
    const { rowCount } = await tx.query(`UPDATE admin_setting_changes
		 SET status = 'rolled_back', rollback_at = now()
		 WHERE id = $1 AND status = 'applied'`, [changeId]);
    return (rowCount ?? 0) > 0;
}
export async function listChanges(tx, settingKey) {
    const { rows } = await tx.query(`SELECT id, actor_id, setting_key, old_value_enc, new_value_enc, reason,
		        status, cooldown_until, applied_at, rollback_at, created_at
		 FROM admin_setting_changes WHERE setting_key = $1 ORDER BY created_at DESC`, [settingKey]);
    return rows;
}
/** Load a single change by id (for apply/rollback state checks within a transaction). */
export async function getChangeById(tx, changeId) {
    const { rows } = await tx.query(`SELECT id, actor_id, setting_key, old_value_enc, new_value_enc, reason,
		        status, cooldown_until, applied_at, rollback_at, created_at
		 FROM admin_setting_changes WHERE id = $1 LIMIT 1`, [changeId]);
    return rows[0] ?? null;
}
//# sourceMappingURL=admin-setting.repository.js.map