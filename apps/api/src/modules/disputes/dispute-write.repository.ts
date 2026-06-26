/**
 * Write-side data access for dispute resolution (task 7.5). Each helper takes
 * the shared money-write transaction client so the settlement record, the
 * decision document, and the deal-state transition all commit atomically with
 * the ledger postings. Not barrel-exported. (Requirements 24.4-24.7)
 */
import type { DisputeOutcome } from './dispute-resolution.js';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface DealMoneyRow {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  preferred_middleman_id?: string | null;
  status: string;
  coin: string;
  network: string;
  amount_smallest_unit: string | null;
  deal_amount: string | null;
  version_no: number;
}

/**
 * Lock and read the money-relevant deal columns for the duration of the
 * resolution transaction. `FOR UPDATE` serializes any concurrent money write
 * on the same deal alongside the `version_no` optimistic lock.
 */
export async function lockDealForSettlement(
  tx: TxClient,
  dealId: string,
): Promise<DealMoneyRow | null> {
  const { rows } = await tx.query<DealMoneyRow>(
    `SELECT id, buyer_id, seller_id, middleman_id, preferred_middleman_id, status, coin, network,
            amount_smallest_unit, deal_amount, version_no
       FROM deals WHERE id = $1 FOR UPDATE`,
    [dealId],
  );
  return rows[0] ?? null;
}

/** Insert the settlement record describing how the escrow was distributed. */
export async function insertSettlement(
  tx: TxClient,
  input: {
    dealId: string;
    type: DisputeOutcome;
    buyerRefundSmallestUnit: bigint;
    sellerReleaseSmallestUnit: bigint;
    reason: string;
    decidedBy: string;
  },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO settlements
       (deal_id, type, buyer_refund_amount, seller_release_amount, reason, decided_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.dealId,
      input.type,
      input.buyerRefundSmallestUnit.toString(),
      input.sellerReleaseSmallestUnit.toString(),
      input.reason,
      input.decidedBy,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('insertSettlement returned no row');
  return row.id;
}

/** Record the rendered decision document in `deal_documents`. */
export async function insertDecisionDocument(
  tx: TxClient,
  input: {
    dealId: string;
    documentNumber: string;
    fileKey: string;
    createdBy: string;
  },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO deal_documents
       (deal_id, document_type, document_number, file_key, created_by)
     VALUES ($1, 'dispute_decision', $2, $3, $4)
     RETURNING id`,
    [input.dealId, input.documentNumber, input.fileKey, input.createdBy],
  );
  const row = rows[0];
  if (!row) throw new Error('insertDecisionDocument returned no row');
  return row.id;
}
