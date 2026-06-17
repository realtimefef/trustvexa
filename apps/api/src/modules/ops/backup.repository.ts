// Persistence for backup_jobs (task 9.2). Tracks automated DB + object backups
// and scheduled restore tests. Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export type BackupType = 'postgres' | 'object_storage' | 'restore_test';
export type BackupStatus = 'running' | 'succeeded' | 'failed';

export interface BackupJobRow {
  id: string;
  backup_type: BackupType;
  status: BackupStatus;
  storage_location: string | null;
  started_at: string;
  completed_at: string | null;
}

export async function startBackup(
  tx: TxClient,
  input: { backupType: BackupType; storageLocation: string | null },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO backup_jobs (backup_type, status, storage_location, started_at)
		 VALUES ($1, 'running', $2, now())
		 RETURNING id`,
    [input.backupType, input.storageLocation],
  );
  const row = rows[0];
  if (!row) throw new Error('startBackup returned no row');
  return row.id;
}

export async function completeBackup(
  tx: TxClient,
  id: string,
  status: Exclude<BackupStatus, 'running'>,
): Promise<void> {
  await tx.query(`UPDATE backup_jobs SET status = $2, completed_at = now() WHERE id = $1`, [
    id,
    status,
  ]);
}

export async function lastSuccessfulBackup(
  tx: TxClient,
  backupType: BackupType,
): Promise<BackupJobRow | null> {
  const { rows } = await tx.query<BackupJobRow>(
    `SELECT id, backup_type, status, storage_location, started_at, completed_at
		 FROM backup_jobs WHERE backup_type = $1 AND status = 'succeeded'
		 ORDER BY completed_at DESC LIMIT 1`,
    [backupType],
  );
  return rows[0] ?? null;
}
