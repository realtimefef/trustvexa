/**
 * Read-side deal data access for the buyer/seller/middleman dashboards and the
 * deal-detail view (task 7.1). All reads are scoped to the requesting user via
 * the `buyer_id | seller_id | middleman_id` columns so a user can only ever see
 * deals they are a party to. Money columns are `bigint` and are returned by
 * node-postgres as decimal strings; they are passed through unchanged (the UI
 * formats them) so no precision is lost. (Requirements 37.4, 36.1, 17.1)
 */
import { query } from '@trustvexa/shared';
/** Exact column list shared by the list and detail reads. */
const DEAL_COLUMNS = `
  id, buyer_id, seller_id, middleman_id, coin, network, network_mode, is_practice,
  deal_amount, amount_coin, amount_smallest_unit, locked_fx_rate, fx_source,
  price_tolerance_pct, fee_payer, platform_fee, seller_settlement_fee,
  transaction_fee, buyer_total, seller_payout, status, hold_status, legal_hold,
  attempt_no, risk_score, fund_by, complete_by, inspection_until,
  last_activity_at, version_no, created_at, updated_at`;
/** All deals the user is a party to, most-recently-active first. */
export async function listDealsForUser(userId) {
    const res = await query(`SELECT ${DEAL_COLUMNS}
       FROM deals
      WHERE buyer_id = $1 OR seller_id = $1 OR middleman_id = $1
      ORDER BY COALESCE(last_activity_at, updated_at, created_at) DESC
      LIMIT 200`, [userId]);
    return res.rows;
}
/** A single deal, but only if the user is a party to it (else `null`). */
export async function getDealForUser(dealId, userId) {
    const res = await query(`SELECT ${DEAL_COLUMNS}
       FROM deals
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR middleman_id = $2)
      LIMIT 1`, [dealId, userId]);
    return res.rows[0] ?? null;
}
/**
 * The deal's audit timeline. `middleman_only` rows are included only when the
 * caller is the middleman; buyers and sellers see `user`-visible rows only
 * (Requirement 36.1 visibility split).
 */
export async function loadTimeline(dealId, includeMiddlemanOnly) {
    const res = await query(`SELECT action, from_state, to_state, visibility, actor_id, created_at
       FROM escrow_logs
      WHERE deal_id = $1 AND ($2::boolean OR visibility = 'user')
      ORDER BY created_at ASC
      LIMIT 500`, [dealId, includeMiddlemanOnly]);
    return res.rows;
}
//# sourceMappingURL=deal-read.repository.js.map