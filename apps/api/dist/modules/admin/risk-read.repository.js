/**
 * Read-side access for the middleman risk/enforcement panel (task 7.3). Reads
 * are scoped to deals assigned to the requesting middleman. (Requirements
 * 39.x, 34.1-34.5)
 */
import { query } from '@trustvexa/shared';
/** Returns the deal's risk score only when it is assigned to this middleman. */
export async function getAssignedDeal(dealId, middlemanId) {
    const res = await query(`SELECT risk_score FROM deals WHERE id = $1 AND middleman_id = $2 LIMIT 1`, [dealId, middlemanId]);
    return res.rows[0] ?? null;
}
export async function listRiskFlags(dealId) {
    const res = await query(`SELECT id, flag_type, severity, details, created_at
       FROM risk_flags WHERE deal_id = $1
      ORDER BY created_at DESC LIMIT 200`, [dealId]);
    return res.rows;
}
//# sourceMappingURL=risk-read.repository.js.map