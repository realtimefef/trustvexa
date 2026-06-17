// Persistence for backup_jobs (task 9.2). Tracks automated DB + object backups
// and scheduled restore tests. Not barrel-exported.
export async function startBackup(tx, input) {
    const { rows } = await tx.query(`INSERT INTO backup_jobs (backup_type, status, storage_location, started_at)
		 VALUES ($1, 'running', $2, now())
		 RETURNING id`, [input.backupType, input.storageLocation]);
    const row = rows[0];
    if (!row)
        throw new Error('startBackup returned no row');
    return row.id;
}
export async function completeBackup(tx, id, status) {
    await tx.query(`UPDATE backup_jobs SET status = $2, completed_at = now() WHERE id = $1`, [
        id,
        status,
    ]);
}
export async function lastSuccessfulBackup(tx, backupType) {
    const { rows } = await tx.query(`SELECT id, backup_type, status, storage_location, started_at, completed_at
		 FROM backup_jobs WHERE backup_type = $1 AND status = 'succeeded'
		 ORDER BY completed_at DESC LIMIT 1`, [backupType]);
    return rows[0] ?? null;
}
//# sourceMappingURL=backup.repository.js.map