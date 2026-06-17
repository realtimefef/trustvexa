/** Lock the payout-queue row for the duration of the transaction. */
export async function lockPayout(tx, payoutId) {
    const { rows } = await tx.query(`SELECT id, deal_id, payee_id, coin, network, address, amount_coin,
            amount_smallest_unit, preflight_status, gas_reserve_status, status,
            hold_until, tx_hash, version_no
       FROM payout_queue WHERE id = $1 FOR UPDATE`, [payoutId]);
    return rows[0] ?? null;
}
/** Lock and read the money-relevant deal columns for the transaction. */
export async function lockDealForPayout(tx, dealId) {
    const { rows } = await tx.query(`SELECT id, buyer_id, seller_id, middleman_id, status, coin, network,
            amount_smallest_unit, legal_hold, version_no
       FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    return rows[0] ?? null;
}
/** Record the preflight summary on the payout row (real columns). */
export async function setPayoutPreflightStatus(tx, payoutId, status) {
    await tx.query(`UPDATE payout_queue
        SET preflight_status = $2, preflight_checked_at = now()
      WHERE id = $1`, [payoutId, status]);
}
/**
 * Distinct operators who have previously recorded a preflight check for this
 * payout. Used to source the two-step dual-control approver set from a REAL
 * column (`payout_preflight_checks.checked_by`) rather than fabricating ids.
 */
export async function listPriorApprovers(tx, payoutQueueId) {
    const { rows } = await tx.query(`SELECT DISTINCT checked_by FROM payout_preflight_checks
      WHERE payout_queue_id = $1 AND checked_by IS NOT NULL`, [payoutQueueId]);
    return rows.map((r) => r.checked_by).filter((v) => v !== null);
}
/** True when the deal has an open/under-review dispute (blocks payout). */
export async function hasOpenDispute(tx, dealId) {
    const { rows } = await tx.query(`SELECT EXISTS (
        SELECT 1 FROM disputes
         WHERE deal_id = $1 AND status IN ('open', 'under_review')
      ) AS exists`, [dealId]);
    return rows[0]?.exists ?? false;
}
/** True when an active token contract is allowlisted for this coin/network. */
export async function isTokenContractAllowlisted(tx, coin, network) {
    const { rows } = await tx.query(`SELECT EXISTS (
        SELECT 1 FROM token_contract_allowlist
         WHERE coin = $1 AND network = $2 AND is_active = true
      ) AS exists`, [coin, network]);
    return rows[0]?.exists ?? false;
}
/**
 * Whether the deal's posted ledger nets to zero per (coin, network). A deal
 * with no entries is trivially balanced. Computed from the REAL `ledger_entries`
 * rows rather than assumed.
 */
export async function isDealLedgerBalanced(tx, dealId) {
    const { rows } = await tx.query(`SELECT coin, network,
            SUM(CASE WHEN direction = 'debit' THEN amount_smallest_unit
                     ELSE -amount_smallest_unit END)::text AS net
       FROM ledger_entries
      WHERE deal_id = $1
      GROUP BY coin, network`, [dealId]);
    return rows.every((r) => BigInt(r.net ?? '0') === 0n);
}
/** True when a terminal refund event already exists for the deal (idempotency). */
export async function hasProcessedRefund(tx, dealId) {
    const { rows } = await tx.query(`SELECT EXISTS (
        SELECT 1 FROM refund_status_events
         WHERE deal_id = $1 AND status_step = 'refunded'
      ) AS exists`, [dealId]);
    return rows[0]?.exists ?? false;
}
/** Append a refund status event (real columns: deal_id, status_step, message). */
export async function insertRefundStatusEvent(tx, input) {
    const { rows } = await tx.query(`INSERT INTO refund_status_events (deal_id, status_step, message)
     VALUES ($1, $2, $3)
     RETURNING id`, [input.dealId, input.statusStep, input.message]);
    const row = rows[0];
    if (!row)
        throw new Error('insertRefundStatusEvent returned no row');
    return row.id;
}
/** Transition the deal to a terminal refunded state under its current status. */
export async function markDealRefunded(tx, dealId, fromStatus) {
    await tx.query(`UPDATE deals SET status = 'Refunded'::deal_status, last_activity_at = now()
      WHERE id = $1 AND status = $2::deal_status`, [dealId, fromStatus]);
}
//# sourceMappingURL=payouts-write.repository.js.map