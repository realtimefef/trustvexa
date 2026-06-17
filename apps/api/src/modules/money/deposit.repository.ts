/**
 * Deposit persistence (tasks 5.18, 5.20, DB-bound).
 *
 * Records detected transfers in `payments` and reorg events in
 * `chain_reorg_events`. Crediting is idempotent via the (tx_hash, output_index)
 * unique constraint: a re-seen deposit updates confirmations/status but never
 * inserts a second row. Classification lives in `deposit-classification.ts` and
 * `confirmations.ts`; this module only persists. `bigint` smallest-unit amounts
 * are bound as strings to preserve precision.
 */
import type { MatchStatus } from './deposit-classification.js';

export interface DepositTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface UpsertPaymentInput {
  dealId: string;
  coin: string;
  network: string;
  tokenContractId: string | null;
  txHash: string;
  outputIndex: number;
  amountCoin: string;
  amountSmallestUnit: bigint;
  confirmations: number;
  direction: 'in' | 'out';
  matchStatus: MatchStatus;
  status: string;
  explorerUrl: string;
}

export interface PaymentRow {
  id: string;
  deal_id: string;
  tx_hash: string;
  output_index: number;
  confirmations: number;
  match_status: MatchStatus;
  status: string;
}

/**
 * Idempotent deposit upsert keyed on (tx_hash, output_index). On conflict the
 * confirmations/match_status/status are refreshed (e.g. as confirmations grow)
 * without creating a duplicate credit row.
 */
export async function upsertPayment(
  client: DepositTxClient,
  input: UpsertPaymentInput,
): Promise<PaymentRow> {
  const { rows } = await client.query<PaymentRow>(
    `INSERT INTO payments
				(deal_id, coin, network, token_contract_id, tx_hash, output_index,
				 amount_coin, amount_smallest_unit, confirmations, direction, match_status, status, explorer_url)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			 ON CONFLICT (tx_hash, output_index) DO UPDATE
				 SET confirmations = EXCLUDED.confirmations,
						 match_status = EXCLUDED.match_status,
						 status = EXCLUDED.status
			 RETURNING id, deal_id, tx_hash, output_index, confirmations, match_status, status`,
    [
      input.dealId,
      input.coin,
      input.network,
      input.tokenContractId,
      input.txHash,
      input.outputIndex,
      input.amountCoin,
      input.amountSmallestUnit.toString(),
      input.confirmations,
      input.direction,
      input.matchStatus,
      input.status,
      input.explorerUrl,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to upsert payment');
  return row;
}

export interface RecordReorgInput {
  paymentId: string;
  dealId: string;
  txHash: string;
  previousStatus: string;
  newStatus: string;
}

export async function recordReorgEvent(
  client: DepositTxClient,
  input: RecordReorgInput,
): Promise<void> {
  await client.query(
    `INSERT INTO chain_reorg_events
				(payment_id, deal_id, tx_hash, previous_status, new_status, detected_at)
			 VALUES ($1, $2, $3, $4, $5, now())`,
    [input.paymentId, input.dealId, input.txHash, input.previousStatus, input.newStatus],
  );
}

/**
 * Active token-contract allowlist rows for a coin/network, shaped for the
 * deposit classifier (`AllowlistEntry`). Token deposits are credited only from
 * an active allowlisted contract; this read backs that check in the watcher.
 */
export interface AllowlistContractRow {
  coin: string;
  network: string;
  contract_address: string;
  is_active: boolean;
}

export async function loadActiveAllowlist(
  client: DepositTxClient,
  coin: string,
  network: string,
): Promise<AllowlistContractRow[]> {
  const { rows } = await client.query<AllowlistContractRow>(
    `SELECT coin, network, contract_address, is_active
			 FROM token_contract_allowlist
			WHERE coin = $1 AND network = $2 AND is_active = true`,
    [coin, network],
  );
  return rows;
}

/**
 * Previously-detected incoming deposits for a deal, used by the watcher to
 * re-check confirmations and detect reorgs (a credited tx that drops below
 * threshold or disappears). Returns only inbound rows.
 */
export interface CreditedDepositRow {
  id: string;
  deal_id: string;
  tx_hash: string;
  output_index: number;
  confirmations: number;
  match_status: MatchStatus | null;
  status: string | null;
}

export async function listInboundDeposits(
  client: DepositTxClient,
  dealId: string,
): Promise<CreditedDepositRow[]> {
  const { rows } = await client.query<CreditedDepositRow>(
    `SELECT id, deal_id, tx_hash, output_index, confirmations, match_status, status
			 FROM payments
			WHERE deal_id = $1 AND direction = 'in' AND tx_hash IS NOT NULL`,
    [dealId],
  );
  return rows;
}

/** Update only the confirmations + status of an existing payment row (reorg path). */
export async function updateDepositStatus(
  client: DepositTxClient,
  paymentId: string,
  confirmations: number,
  status: string,
): Promise<void> {
  await client.query(`UPDATE payments SET confirmations = $2, status = $3 WHERE id = $1`, [
    paymentId,
    confirmations,
    status,
  ]);
}
