/**
 * Read-side data access for the operator treasury panel (task 7.4). Returns the
 * most recent reconciliation snapshot per (coin, network). Balances are
 * smallest-unit integers stored as numeric and returned as decimal strings, so
 * they pass through unchanged with no precision loss. (Requirements 45.3, 45.4)
 */
import { query } from '@trustvexa/shared';

export interface TreasurySnapshotRow {
  coin: string;
  network: string;
  held_in_escrow: string;
  owed_to_sellers: string;
  refunds_owed: string;
  platform_fee_revenue: string;
  gas_spent: string;
  hot_balance: string;
  cold_balance: string;
  ledger_balance: string;
  onchain_balance: string;
  reconciled: boolean;
  snapshot_at: Date | string;
  created_at: Date | string;
}

/** The latest snapshot for every coin/network pair, newest first. */
export async function listLatestSnapshots(): Promise<TreasurySnapshotRow[]> {
  const res = await query<TreasurySnapshotRow>(
    `SELECT DISTINCT ON (coin, network)
            coin, network, held_in_escrow, owed_to_sellers, refunds_owed,
            platform_fee_revenue, gas_spent, hot_balance, cold_balance,
            ledger_balance, onchain_balance, reconciled, snapshot_at, created_at
       FROM treasury_snapshots
      ORDER BY coin, network, created_at DESC
      LIMIT 200`,
  );
  return res.rows;
}
