// Persistence for incident_pauses (task 9.1). Every pause/unpause is logged.
// Not barrel-exported.
import type { IncidentPause, PauseScope } from './emergency-pause.js';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

interface IncidentPauseRow {
  id: string;
  scope: PauseScope;
  chain: string | null;
  reason: string;
  started_by: string;
  started_at: string;
  ended_by: string | null;
  ended_at: string | null;
}

function toModel(row: IncidentPauseRow): IncidentPause {
  return {
    scope: row.scope,
    chain: row.chain,
    reason: row.reason,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

export async function startPause(
  tx: TxClient,
  input: { scope: PauseScope; chain: string | null; reason: string; startedBy: string },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO incident_pauses (scope, chain, reason, started_by, started_at)
		 VALUES ($1, $2, $3, $4, now())
		 RETURNING id`,
    [input.scope, input.chain, input.reason, input.startedBy],
  );
  const row = rows[0];
  if (!row) throw new Error('startPause returned no row');
  return row.id;
}

export async function endPause(tx: TxClient, id: string, endedBy: string): Promise<void> {
  await tx.query(
    `UPDATE incident_pauses SET ended_by = $2, ended_at = now() WHERE id = $1 AND ended_at IS NULL`,
    [id, endedBy],
  );
}

export async function listActivePauses(tx: TxClient): Promise<IncidentPause[]> {
  const { rows } = await tx.query<IncidentPauseRow>(
    `SELECT id, scope, chain, reason, started_by, started_at, ended_by, ended_at
		 FROM incident_pauses WHERE ended_at IS NULL ORDER BY started_at DESC`,
  );
  return rows.map(toModel);
}
