/**
 * Payout queue persistence (tasks 5.23, 5.24, DB-bound).
 *
 * Manages `payout_queue` rows, records `payout_preflight_checks`, and reads the
 * `withdrawal_allowlist` and `operator_payout_limits` that feed the preflight
 * context. Authorization logic lives in `payout-preflight.ts` /
 * `payout-queue.ts`; this module only persists and reads. `bigint` amounts are
 * bound/returned as strings to preserve precision.
 */
import type { PreflightCheckResult } from './payout-preflight.js';
import type { PayoutQueueStatus } from './payout-queue.js';

export interface PayoutQueueTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface EnqueuePayoutInput {
  dealId: string;
  payeeId: string;
  coin: string;
  network: string;
  address: string;
  amountCoin: string;
  amountSmallestUnit: bigint;
  holdUntil: string | null;
}

export interface PayoutQueueRow {
  id: string;
  deal_id: string;
  status: PayoutQueueStatus;
  version_no: number;
}

export async function enqueuePayout(
  client: PayoutQueueTxClient,
  input: EnqueuePayoutInput,
): Promise<PayoutQueueRow> {
  const { rows } = await client.query<PayoutQueueRow>(
    `INSERT INTO payout_queue
				(deal_id, payee_id, coin, network, address, amount_coin, amount_smallest_unit, status, hold_until)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
			 RETURNING id, deal_id, status, version_no`,
    [
      input.dealId,
      input.payeeId,
      input.coin,
      input.network,
      input.address,
      input.amountCoin,
      input.amountSmallestUnit.toString(),
      input.holdUntil,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to enqueue payout');
  return row;
}

/**
 * Advance payout status with an optimistic version guard. Returns the new
 * version, or null if another writer moved first (caller should reload).
 */
export async function updatePayoutStatus(
  client: PayoutQueueTxClient,
  payoutId: string,
  expectedVersion: number,
  nextStatus: PayoutQueueStatus,
  txHash: string | null,
): Promise<number | null> {
  const { rows } = await client.query<{ version_no: number }>(
    `UPDATE payout_queue
				 SET status = $3, tx_hash = COALESCE($4, tx_hash), version_no = version_no + 1
			 WHERE id = $1 AND version_no = $2
			 RETURNING version_no`,
    [payoutId, expectedVersion, nextStatus, txHash],
  );
  return rows[0]?.version_no ?? null;
}

export async function recordPreflightChecks(
  client: PayoutQueueTxClient,
  payoutQueueId: string,
  dealId: string,
  checkedBy: string,
  results: readonly PreflightCheckResult[],
): Promise<void> {
  for (const r of results) {
    await client.query(
      `INSERT INTO payout_preflight_checks
					(payout_queue_id, deal_id, check_type, result, message, checked_by)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
      [payoutQueueId, dealId, r.check, r.passed ? 'pass' : 'fail', r.message, checkedBy],
    );
  }
}

export interface AllowlistStatus {
  activeFrom: string | null;
  isActive: boolean;
}

export async function loadAllowlistStatus(
  client: PayoutQueueTxClient,
  coin: string,
  network: string,
  address: string,
): Promise<AllowlistStatus | null> {
  const { rows } = await client.query<{ active_from: string | null; is_active: boolean }>(
    `SELECT active_from, is_active
			 FROM withdrawal_allowlist
			WHERE coin = $1 AND network = $2 AND address = $3
			LIMIT 1`,
    [coin, network, address],
  );
  const row = rows[0];
  if (!row) return null;
  return { activeFrom: row.active_from, isActive: row.is_active };
}

export interface OperatorCap {
  dailyCapSmallestUnit: bigint;
  usedTodaySmallestUnit: bigint;
  remainingSmallestUnit: bigint;
}

export async function loadOperatorCap(
  client: PayoutQueueTxClient,
  coin: string,
  network: string,
): Promise<OperatorCap | null> {
  const { rows } = await client.query<{ daily_cap: string; used_today: string }>(
    `SELECT daily_cap, used_today
			 FROM operator_payout_limits
			WHERE coin = $1 AND network = $2
			LIMIT 1`,
    [coin, network],
  );
  const row = rows[0];
  if (!row) return null;
  const cap = BigInt(row.daily_cap);
  const used = BigInt(row.used_today);
  const remaining = cap - used;
  return {
    dailyCapSmallestUnit: cap,
    usedTodaySmallestUnit: used,
    remainingSmallestUnit: remaining < 0n ? 0n : remaining,
  };
}
