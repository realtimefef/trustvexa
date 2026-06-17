function toModel(row) {
    return {
        scope: row.scope,
        chain: row.chain,
        reason: row.reason,
        startedAt: row.started_at,
        endedAt: row.ended_at,
    };
}
export async function startPause(tx, input) {
    const { rows } = await tx.query(`INSERT INTO incident_pauses (scope, chain, reason, started_by, started_at)
		 VALUES ($1, $2, $3, $4, now())
		 RETURNING id`, [input.scope, input.chain, input.reason, input.startedBy]);
    const row = rows[0];
    if (!row)
        throw new Error('startPause returned no row');
    return row.id;
}
export async function endPause(tx, id, endedBy) {
    await tx.query(`UPDATE incident_pauses SET ended_by = $2, ended_at = now() WHERE id = $1 AND ended_at IS NULL`, [id, endedBy]);
}
export async function listActivePauses(tx) {
    const { rows } = await tx.query(`SELECT id, scope, chain, reason, started_by, started_at, ended_by, ended_at
		 FROM incident_pauses WHERE ended_at IS NULL ORDER BY started_at DESC`);
    return rows.map(toModel);
}
//# sourceMappingURL=incident-pause.repository.js.map