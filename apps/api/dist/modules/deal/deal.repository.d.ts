import type { EscrowLogEntry } from './audit-chain.js';
import type { DealStatus } from './state-machine.js';
/**
 * Minimal structural shape of a pooled client used inside a transaction. Kept
 * local so this module does not need a direct `pg` type dependency; a real
 * `pg.PoolClient` satisfies it structurally.
 */
export interface TxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
    release: () => void;
}
export interface DealVersionRow {
    status: DealStatus;
    version_no: number;
}
export type EscrowLogVisibility = 'user' | 'middleman_only';
/** Acquire a dedicated pooled client for a transaction. */
export declare function acquireClient(): Promise<TxClient>;
/** Read the current status + optimistic-lock version for a deal. */
export declare function loadDealVersion(client: TxClient, dealId: string): Promise<DealVersionRow | null>;
/**
 * Read the most recent escrow-log `entry_hash` for a deal so the next entry can
 * chain onto it. Per-deal appends are serialized by the deal optimistic lock,
 * so ordering by `created_at` is unambiguous; the genesis hash is returned when
 * the deal has no log entries yet.
 */
export declare function loadLastEntryHash(client: TxClient, dealId: string): Promise<string>;
/**
 * Apply the new status under the optimistic lock. Returns the number of rows
 * updated: 0 means a concurrent writer already advanced `version_no`, so the
 * caller must abort the transaction and leave the deal unchanged.
 */
export declare function applyDealStatus(client: TxClient, dealId: string, toStatus: DealStatus, readVersion: number, nextVersion: number): Promise<number>;
/**
 * Append one hash-chained audit row. `from_state`/`to_state` are recorded in
 * `metadata`; `action` is the event name; `prev_hash`/`entry_hash` come from the
 * pure audit-chain helper so the stored row reproduces the same hash.
 */
export declare function insertEscrowLog(client: TxClient, entry: EscrowLogEntry, action: string, visibility: EscrowLogVisibility, actorDbId: string | null): Promise<void>;
//# sourceMappingURL=deal.repository.d.ts.map