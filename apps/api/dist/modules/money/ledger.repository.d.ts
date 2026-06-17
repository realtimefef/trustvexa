/**
 * Ledger persistence (task 5.9, DB-bound).
 *
 * Thin, parameterized SQL over `ledger_accounts` and `ledger_entries`. The
 * balance decision lives in `ledger.ts`; this module only resolves accounts
 * and inserts entries. A group is validated with `assertBalanced` BEFORE any
 * INSERT, so an unbalanced write issues no rows and leaves the ledger unchanged
 * (Requirement 17.7). All callers run inside the money-write transaction
 * (task 5.11), so these helpers take an existing transactional client.
 *
 * `bigint` amounts are bound as strings so PostgreSQL `bigint` columns keep
 * full precision (node-postgres would otherwise coerce large numbers).
 */
import { type EntryGroup, type LedgerAccountType } from './ledger.js';
/** Minimal structural shape of a transactional pooled client (pg.PoolClient). */
export interface LedgerTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface LedgerAccountKey {
    readonly accountType: LedgerAccountType;
    readonly coin: string;
    readonly network: string;
    readonly ownerUserId?: string | null;
    readonly dealId?: string | null;
}
/**
 * Resolve (find or create) the ledger account for a key. `IS NOT DISTINCT FROM`
 * matches NULL owner/deal columns so global accounts (e.g. platform revenue)
 * are reused rather than duplicated.
 */
export declare function findOrCreateAccount(client: LedgerTxClient, key: LedgerAccountKey): Promise<string>;
export interface EntryGroupRefs {
    readonly dealId?: string | null;
    readonly paymentId?: string | null;
    readonly payoutQueueId?: string | null;
    readonly settlementId?: string | null;
}
/**
 * Persist one balanced entry group. Validates balance first (rejecting an
 * unbalanced group before any INSERT), then writes every posting under the
 * shared `entry_group_id`. Must be called inside the money-write transaction.
 */
export declare function postEntryGroup(client: LedgerTxClient, group: EntryGroup, refs?: EntryGroupRefs): Promise<void>;
/** Persist many balanced groups in order (inside the money-write transaction). */
export declare function postEntryGroups(client: LedgerTxClient, groups: readonly EntryGroup[], refs?: EntryGroupRefs): Promise<void>;
//# sourceMappingURL=ledger.repository.d.ts.map