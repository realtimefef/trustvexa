/**
 * Deal data access (task 4.9 — DB-bound transition step).
 *
 * Thin, parameterized SQL over the §16 schema: `deals` and the hash-chained
 * `escrow_logs`. The state-machine decision and hashing live above this layer
 * (state-machine.ts / transition.ts / audit-chain.ts); this module only
 * reads/writes rows. The optimistic lock lives in `applyDealStatus`, whose
 * `WHERE version_no = :readVersion` guard makes concurrent writers fail
 * (Property 7), and `insertEscrowLog` appends exactly one audit row in the same
 * transaction (Property 9 / Property 20). (Requirements 13.3, 17.11, 17.12, 38.4)
 */
import { getClient } from '@trustvexa/shared';

import type { EscrowLogEntry } from './audit-chain.js';
import { GENESIS_PREV_HASH } from './audit-chain.js';
import type { DealStatus } from './state-machine.js';

/**
 * Minimal structural shape of a pooled client used inside a transaction. Kept
 * local so this module does not need a direct `pg` type dependency; a real
 * `pg.PoolClient` satisfies it structurally.
 */
export interface TxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
  release: () => void;
}

export interface DealVersionRow {
  status: DealStatus;
  version_no: number;
}

export type EscrowLogVisibility = 'user' | 'middleman_only';

/** Acquire a dedicated pooled client for a transaction. */
export async function acquireClient(): Promise<TxClient> {
  return (await getClient()) as unknown as TxClient;
}

/** Read the current status + optimistic-lock version for a deal. */
export async function loadDealVersion(
  client: TxClient,
  dealId: string,
): Promise<DealVersionRow | null> {
  const res = await client.query<DealVersionRow>(
    `SELECT status, version_no FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

/**
 * Read the most recent escrow-log `entry_hash` for a deal so the next entry can
 * chain onto it. Per-deal appends are serialized by the deal optimistic lock,
 * so ordering by `created_at` is unambiguous; the genesis hash is returned when
 * the deal has no log entries yet.
 */
export async function loadLastEntryHash(client: TxClient, dealId: string): Promise<string> {
  const res = await client.query<{ entry_hash: string }>(
    `SELECT entry_hash FROM escrow_logs WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [dealId],
  );
  return res.rows[0]?.entry_hash ?? GENESIS_PREV_HASH;
}

/**
 * Apply the new status under the optimistic lock. Returns the number of rows
 * updated: 0 means a concurrent writer already advanced `version_no`, so the
 * caller must abort the transaction and leave the deal unchanged.
 */
export async function applyDealStatus(
  client: TxClient,
  dealId: string,
  toStatus: DealStatus,
  readVersion: number,
  nextVersion: number,
): Promise<number> {
  const res = await client.query(
    `UPDATE deals
        SET status = $1, version_no = $2, updated_at = now()
      WHERE id = $3 AND version_no = $4`,
    [toStatus, nextVersion, dealId, readVersion],
  );
  return res.rowCount ?? 0;
}

/**
 * Append one hash-chained audit row. `from_state`/`to_state` are recorded in
 * `metadata`; `action` is the event name; `prev_hash`/`entry_hash` come from the
 * pure audit-chain helper so the stored row reproduces the same hash.
 */
export async function insertEscrowLog(
  client: TxClient,
  entry: EscrowLogEntry,
  action: string,
  visibility: EscrowLogVisibility,
  // Real `users.id`, or NULL for system-initiated transitions (lifecycle
  // timers). The audit-chain hash still binds a stable actor label; this is
  // only the nullable FK column value.
  actorDbId: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO escrow_logs
       (deal_id, action, actor_id, visibility, request_id, metadata, prev_hash, entry_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
    [
      entry.dealId,
      action,
      actorDbId,
      visibility,
      entry.requestId,
      JSON.stringify({ from_state: entry.fromState, to_state: entry.toState, event: action }),
      entry.prevHash,
      entry.entryHash,
      entry.createdAt,
    ],
  );
}
