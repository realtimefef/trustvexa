/**
 * Custody persistence (task 5.25, DB-bound).
 *
 * Records hot->cold sweeps, gas top-ups, stuck-tx retries, and address
 * screening/poisoning alerts. Decision logic lives in `custody.ts`; this module
 * only persists. `bigint` smallest-unit amounts are bound as strings.
 */
import type { StuckAction } from './custody.js';

export interface CustodyTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface RecordSweepInput {
  coin: string;
  network: string;
  amountSmallestUnit: bigint;
  thresholdSmallestUnit: bigint;
  fromHotAddress: string;
  toColdAddress: string;
  txHash: string | null;
}

export async function recordSweep(client: CustodyTxClient, input: RecordSweepInput): Promise<void> {
  await client.query(
    `INSERT INTO hot_wallet_sweeps
				(coin, network, amount_smallest_unit, threshold, from_hot_address, to_cold_address, tx_hash, swept_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      input.coin,
      input.network,
      input.amountSmallestUnit.toString(),
      input.thresholdSmallestUnit.toString(),
      input.fromHotAddress,
      input.toColdAddress,
      input.txHash,
    ],
  );
}

export interface RecordGasTopUpInput {
  coin: string;
  network: string;
  fromAddress: string;
  toHotWalletAddress: string;
  amountSmallestUnit: bigint;
  txHash: string | null;
  status: string;
}

export async function recordGasTopUp(
  client: CustodyTxClient,
  input: RecordGasTopUpInput,
): Promise<void> {
  await client.query(
    `INSERT INTO gas_top_up_events
				(coin, network, from_address, to_hot_wallet_address, amount_smallest_unit, tx_hash, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.coin,
      input.network,
      input.fromAddress,
      input.toHotWalletAddress,
      input.amountSmallestUnit.toString(),
      input.txHash,
      input.status,
    ],
  );
}

export interface RecordRetryInput {
  paymentId: string | null;
  payoutQueueId: string | null;
  dealId: string;
  reason: string;
  action: StuckAction;
  oldTxHash: string | null;
  newTxHash: string | null;
  status: string;
}

export async function recordTransactionRetry(
  client: CustodyTxClient,
  input: RecordRetryInput,
): Promise<void> {
  await client.query(
    `INSERT INTO transaction_retries
				(payment_id, payout_queue_id, deal_id, reason, action, old_tx_hash, new_tx_hash, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.paymentId,
      input.payoutQueueId,
      input.dealId,
      input.reason,
      input.action,
      input.oldTxHash,
      input.newTxHash,
      input.status,
    ],
  );
}

export interface RecordPoisoningAlertInput {
  userId: string | null;
  dealId: string | null;
  suspectedAddress: string;
  realAddress: string;
  sourceTxHash: string | null;
}

export async function recordPoisoningAlert(
  client: CustodyTxClient,
  input: RecordPoisoningAlertInput,
): Promise<void> {
  await client.query(
    `INSERT INTO address_poisoning_alerts
				(user_id, deal_id, suspected_address, real_address, source_tx_hash)
			 VALUES ($1, $2, $3, $4, $5)`,
    [input.userId, input.dealId, input.suspectedAddress, input.realAddress, input.sourceTxHash],
  );
}

export interface RecordScreeningInput {
  address: string;
  coin: string;
  network: string;
  result: string;
  source: string;
}

export async function recordAddressScreening(
  client: CustodyTxClient,
  input: RecordScreeningInput,
): Promise<void> {
  await client.query(
    `INSERT INTO address_screenings (address, coin, network, result, source, checked_at)
			 VALUES ($1, $2, $3, $4, $5, now())`,
    [input.address, input.coin, input.network, input.result, input.source],
  );
}
