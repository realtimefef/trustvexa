/**
 * Write-side data access for payout approval/broadcast and refund processing.
 *
 * Every helper takes the shared money-write transaction client so the payout
 * status transition, the recorded preflight checks, the refund status event,
 * and the ledger postings all commit atomically (or roll back together). This
 * module only persists/reads REAL columns from the `payout_queue`, `deals`,
 * `payout_preflight_checks`, `refund_status_events`, `token_contract_allowlist`,
 * and `ledger_entries` migrations; authorization/preflight logic lives in the
 * service and in `money/payout-preflight.ts`. `bigint` amounts are bound and
 * returned as strings to preserve precision.
 */
export interface PayoutTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface PayoutLockRow {
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
  status: string;
  hold_until: Date | string | null;
  tx_hash: string | null;
  version_no: number;
}

/** Lock the payout-queue row for the duration of the transaction. */
export async function lockPayout(
  tx: PayoutTxClient,
  payoutId: string,
): Promise<PayoutLockRow | null> {
  const { rows } = await tx.query<PayoutLockRow>(
    `SELECT id, deal_id, payee_id, coin, network, address, amount_coin,
            amount_smallest_unit, preflight_status, gas_reserve_status, status,
            hold_until, tx_hash, version_no
       FROM payout_queue WHERE id = $1 FOR UPDATE`,
    [payoutId],
  );
  return rows[0] ?? null;
}

export interface DealPayoutRow {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  status: string;
  coin: string;
  network: string;
  amount_smallest_unit: string | null;
  legal_hold: boolean;
  version_no: number;
}

/** Lock and read the money-relevant deal columns for the transaction. */
export async function lockDealForPayout(
  tx: PayoutTxClient,
  dealId: string,
): Promise<DealPayoutRow | null> {
  const { rows } = await tx.query<DealPayoutRow>(
    `SELECT id, buyer_id, seller_id, middleman_id, status, coin, network,
            amount_smallest_unit, legal_hold, version_no
       FROM deals WHERE id = $1 FOR UPDATE`,
    [dealId],
  );
  return rows[0] ?? null;
}

/** Record the preflight summary on the payout row (real columns). */
export async function setPayoutPreflightStatus(
  tx: PayoutTxClient,
  payoutId: string,
  status: string,
): Promise<void> {
  await tx.query(
    `UPDATE payout_queue
        SET preflight_status = $2, preflight_checked_at = now()
      WHERE id = $1`,
    [payoutId, status],
  );
}

/**
 * Distinct operators who have previously recorded a preflight check for this
 * payout. Used to source the two-step dual-control approver set from a REAL
 * column (`payout_preflight_checks.checked_by`) rather than fabricating ids.
 */
export async function listPriorApprovers(
  tx: PayoutTxClient,
  payoutQueueId: string,
): Promise<string[]> {
  const { rows } = await tx.query<{ checked_by: string | null }>(
    `SELECT DISTINCT checked_by FROM payout_preflight_checks
      WHERE payout_queue_id = $1 AND checked_by IS NOT NULL`,
    [payoutQueueId],
  );
  return rows.map((r) => r.checked_by).filter((v): v is string => v !== null);
}

/** True when the deal has an open/under-review dispute (blocks payout). */
export async function hasOpenDispute(tx: PayoutTxClient, dealId: string): Promise<boolean> {
  const { rows } = await tx.query<{ exists: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM disputes
         WHERE deal_id = $1 AND status IN ('open', 'under_review')
      ) AS exists`,
    [dealId],
  );
  return rows[0]?.exists ?? false;
}

/** True when an active token contract is allowlisted for this coin/network. */
export async function isTokenContractAllowlisted(
  tx: PayoutTxClient,
  coin: string,
  network: string,
): Promise<boolean> {
  const { rows } = await tx.query<{ exists: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM token_contract_allowlist
         WHERE coin = $1 AND network = $2 AND is_active = true
      ) AS exists`,
    [coin, network],
  );
  return rows[0]?.exists ?? false;
}

/**
 * Whether the deal's posted ledger nets to zero per (coin, network). A deal
 * with no entries is trivially balanced. Computed from the REAL `ledger_entries`
 * rows rather than assumed.
 */
export async function isDealLedgerBalanced(tx: PayoutTxClient, dealId: string): Promise<boolean> {
  const { rows } = await tx.query<{ coin: string | null; network: string | null; net: string }>(
    `SELECT coin, network,
            SUM(CASE WHEN direction = 'debit' THEN amount_smallest_unit
                     ELSE -amount_smallest_unit END)::text AS net
       FROM ledger_entries
      WHERE deal_id = $1
      GROUP BY coin, network`,
    [dealId],
  );
  return rows.every((r) => BigInt(r.net ?? '0') === 0n);
}

/** True when a terminal refund event already exists for the deal (idempotency). */
export async function hasProcessedRefund(tx: PayoutTxClient, dealId: string): Promise<boolean> {
  const { rows } = await tx.query<{ exists: boolean }>(
    `SELECT EXISTS (
        SELECT 1 FROM refund_status_events
         WHERE deal_id = $1 AND status_step = 'refunded'
      ) AS exists`,
    [dealId],
  );
  return rows[0]?.exists ?? false;
}

/** Append a refund status event (real columns: deal_id, status_step, message). */
export async function insertRefundStatusEvent(
  tx: PayoutTxClient,
  input: { dealId: string; statusStep: string; message: string },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO refund_status_events (deal_id, status_step, message)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.dealId, input.statusStep, input.message],
  );
  const row = rows[0];
  if (!row) throw new Error('insertRefundStatusEvent returned no row');
  return row.id;
}

/** Transition the deal to a terminal refunded state under its current status. */
export async function markDealRefunded(
  tx: PayoutTxClient,
  dealId: string,
  fromStatus: string,
): Promise<void> {
  await tx.query(
    `UPDATE deals SET status = 'Refunded'::deal_status, last_activity_at = now()
      WHERE id = $1 AND status = $2::deal_status`,
    [dealId, fromStatus],
  );
}
