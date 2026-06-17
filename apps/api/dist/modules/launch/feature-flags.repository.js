function toModel(row) {
    return {
        flagKey: row.flag_key,
        description: row.description,
        isEnabled: row.is_enabled,
        scope: row.scope,
    };
}
export async function listFlags(tx) {
    const { rows } = await tx.query(`SELECT flag_key, description, is_enabled, scope FROM feature_flags`);
    return rows.map(toModel);
}
export async function setFlag(tx, input) {
    const { rows } = await tx.query(`INSERT INTO feature_flags (flag_key, description, is_enabled, scope, updated_by)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (flag_key)
		 DO UPDATE SET is_enabled = EXCLUDED.is_enabled, description = EXCLUDED.description,
		               scope = EXCLUDED.scope, updated_by = EXCLUDED.updated_by
		 RETURNING flag_key, description, is_enabled, scope`, [input.flagKey, input.description, input.isEnabled, input.scope, input.updatedBy]);
    const row = rows[0];
    if (!row)
        throw new Error('setFlag returned no row');
    return toModel(row);
}
//# sourceMappingURL=feature-flags.repository.js.map