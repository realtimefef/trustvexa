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
import { assertBalanced, type EntryGroup, type LedgerAccountType } from './ledger.js';

/** Minimal structural shape of a transactional pooled client (pg.PoolClient). */
export interface LedgerTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
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
export async function findOrCreateAccount(
  client: LedgerTxClient,
  key: LedgerAccountKey,
): Promise<string> {
  const owner = key.ownerUserId ?? null;
  const deal = key.dealId ?? null;
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM ledger_accounts
        WHERE account_type = $1
          AND coin IS NOT DISTINCT FROM $2
          AND network IS NOT DISTINCT FROM $3
          AND owner_user_id IS NOT DISTINCT FROM $4
          AND deal_id IS NOT DISTINCT FROM $5
        LIMIT 1`,
    [key.accountType, key.coin, key.network, owner, deal],
  );
  const found = existing.rows[0];
  if (found) return found.id;

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO ledger_accounts (account_type, coin, network, owner_user_id, deal_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [key.accountType, key.coin, key.network, owner, deal],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error('Failed to create ledger account');
  return row.id;
}

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
export async function postEntryGroup(
  client: LedgerTxClient,
  group: EntryGroup,
  refs: EntryGroupRefs = {},
): Promise<void> {
  assertBalanced(group);
  for (const posting of group.postings) {
    const accountId = await findOrCreateAccount(client, {
      accountType: posting.accountType,
      coin: posting.coin,
      network: posting.network,
      ownerUserId: posting.ownerUserId ?? null,
      dealId: posting.dealId ?? refs.dealId ?? null,
    });
    await client.query(
      `INSERT INTO ledger_entries
         (ledger_account_id, deal_id, payment_id, payout_queue_id, settlement_id,
          direction, amount_smallest_unit, coin, network, entry_group_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        accountId,
        posting.dealId ?? refs.dealId ?? null,
        refs.paymentId ?? null,
        refs.payoutQueueId ?? null,
        refs.settlementId ?? null,
        posting.direction,
        posting.amountSmallestUnit.toString(),
        posting.coin,
        posting.network,
        group.entryGroupId,
        posting.reason,
      ],
    );
  }
}

/** Persist many balanced groups in order (inside the money-write transaction). */
export async function postEntryGroups(
  client: LedgerTxClient,
  groups: readonly EntryGroup[],
  refs: EntryGroupRefs = {},
): Promise<void> {
  for (const group of groups) {
    await postEntryGroup(client, group, refs);
  }
}
