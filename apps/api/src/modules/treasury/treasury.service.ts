/**
 * Treasury reconciliation service (task 7.4). Composes the latest snapshot per
 * coin/network into operator-facing lines and flags mismatches where the
 * on-chain balance diverges from the ledger balance. Money values stay as
 * smallest-unit decimal strings; the delta is computed with BigInt so large
 * balances never lose precision. (Requirements 45.3, 45.4)
 */
import { listLatestSnapshots, type TreasurySnapshotRow } from './treasury-read.repository.js';

export interface TreasuryLine {
  coin: string;
  network: string;
  heldInEscrow: string;
  owedToSellers: string;
  refundsOwed: string;
  platformFeeRevenue: string;
  gasSpent: string;
  hotBalance: string;
  coldBalance: string;
  ledgerBalance: string;
  onchainBalance: string;
  /** onchain - ledger in smallest units. '0' when fully reconciled. */
  deltaSmallestUnit: string;
  reconciled: boolean;
  /** True when not reconciled or the on-chain/ledger balances diverge. */
  mismatch: boolean;
  snapshotAt: string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function safeDelta(onchain: string, ledger: string): string {
  try {
    return (BigInt(onchain) - BigInt(ledger)).toString();
  } catch {
    return '0';
  }
}

function toLine(row: TreasurySnapshotRow): TreasuryLine {
  const deltaSmallestUnit = safeDelta(row.onchain_balance, row.ledger_balance);
  return {
    coin: row.coin,
    network: row.network,
    heldInEscrow: row.held_in_escrow,
    owedToSellers: row.owed_to_sellers,
    refundsOwed: row.refunds_owed,
    platformFeeRevenue: row.platform_fee_revenue,
    gasSpent: row.gas_spent,
    hotBalance: row.hot_balance,
    coldBalance: row.cold_balance,
    ledgerBalance: row.ledger_balance,
    onchainBalance: row.onchain_balance,
    deltaSmallestUnit,
    reconciled: row.reconciled,
    mismatch: !row.reconciled || deltaSmallestUnit !== '0',
    snapshotAt: toIso(row.snapshot_at),
  };
}

export interface TreasuryView {
  lines: TreasuryLine[];
  mismatchCount: number;
}

export async function getTreasury(): Promise<TreasuryView> {
  const rows = await listLatestSnapshots();
  const lines = rows.map(toLine);
  return { lines, mismatchCount: lines.filter((l) => l.mismatch).length };
}
