/**
 * Read-side data access for the middleman/admin console (task 7.2). All reads
 * are scoped to the signed-in middleman via `deals.middleman_id`, so a
 * middleman only ever sees the deals (and their disputes) they are assigned to.
 * Money columns are `bigint` and pass through as decimal strings unchanged.
 * (Requirements 34.x, 7.x)
 */
import { query } from '@trustvexa/shared';
/** Every deal the middleman is assigned to, most-recently-active first. */
export async function listMiddlemanQueue(userId) {
    const res = await query(`SELECT id, status, risk_score, deal_amount, coin, network, is_practice,
            hold_status, last_activity_at, fund_by, complete_by
       FROM deals
      WHERE middleman_id = $1
      ORDER BY COALESCE(last_activity_at, updated_at, created_at) DESC
      LIMIT 200`, [userId]);
    return res.rows;
}
/** Open / under-review disputes for deals this middleman handles. */
export async function listOpenDisputesForMiddleman(userId) {
    const res = await query(`SELECT dp.id, dp.deal_id, dp.reason, dp.status, dp.created_at,
            d.status AS deal_status, d.coin, d.network
       FROM disputes dp
       JOIN deals d ON d.id = dp.deal_id
      WHERE d.middleman_id = $1 AND dp.status IN ('open', 'under_review')
      ORDER BY dp.created_at ASC
      LIMIT 200`, [userId]);
    return res.rows;
}
//# sourceMappingURL=admin-read.repository.js.map