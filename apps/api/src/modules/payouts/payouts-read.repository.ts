/**
 * Read-side data access for the payouts/refunds operator router.
 *
 * All reads are scoped at the service layer to the deal's assigned middleman,
 * mirroring the dispute access pattern: the same 404 is returned whether a
 * payout does not exist or the caller is not its deal's middleman, so the
 * endpoint never confirms the existence of another operator's payout. Only
 * REAL columns from the `payout_queue`, `deals`, and `refund_status_events`
 * migrations are read here. `bigint` amounts stay strings to preserve precision.
 */
import { query } from '@trustvexa/shared';

import type { PayoutQueueStatus } from '../money/payout-queue.js';

/** A payout-queue row joined to the parties needed for access control. */
export interface PayoutQueueListRow {
  id: string;
  deal_id: string;
  payee_id: string | null;
  coin: string;
  network: string;
  address: string | null;
  amount_coin: string | null;
  amount_smallest_unit: string | null;
  preflight_status: string | null;
  gas_reserve_status: string | null;
  status: PayoutQueueStatus;
  hold_until: Date | string | null;
  tx_hash: string | null;
  version_no: number;
  created_at: Date | string;
}

/**
 * List the pending/approved payouts whose deal is assigned to this middleman.
 * Scoping by `deals.middleman_id` keeps the queue consistent with the
 * assigned-middleman authorization enforced on the write endpoints.
 */
export async function listQueueForMiddleman(
  middlemanId: string,
  limit = 100,
): Promise<PayoutQueueListRow[]> {
  const res = await query<PayoutQueueListRow>(
    `SELECT pq.id, pq.deal_id, pq.payee_id, pq.coin, pq.network, pq.address,
            pq.amount_coin, pq.amount_smallest_unit, pq.preflight_status,
            pq.gas_reserve_status, pq.status, pq.hold_until, pq.tx_hash,
            pq.version_no, pq.created_at
       FROM payout_queue pq
       JOIN deals d ON d.id = pq.deal_id
      WHERE d.middleman_id = $1
        AND pq.status IN ('pending', 'approved')
      ORDER BY pq.created_at ASC
      LIMIT $2`,
    [middlemanId, limit],
  );
  return res.rows;
}
