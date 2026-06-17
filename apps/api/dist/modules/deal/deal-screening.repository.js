/**
 * Data access for prohibited-item screening outcomes (task 4.2).
 *
 * Screening findings are persisted to `risk_flags`; risky deals are routed to
 * middleman review by setting `hold_status = 'mm_review'` on the deal so the
 * funding flow (task 5.x) can refuse to fund until a middleman clears it
 * (Requirement 9.2). All SQL is parameterized.
 */
import { query } from '@trustvexa/shared';
/** Hold marker written to deals.hold_status when a deal needs middleman review. */
export const MIDDLEMAN_REVIEW_HOLD = 'mm_review';
/** Insert a risk flag inside an open transaction (deal being created). */
export async function insertRiskFlag(client, flag) {
    await client.query(`INSERT INTO risk_flags (deal_id, user_id, flag_type, severity, details)
     VALUES ($1, $2, $3, $4, $5)`, [flag.dealId, flag.userId, flag.flagType, flag.severity, flag.details]);
}
/**
 * Insert a risk flag with no open transaction. Used to record a blocked
 * creation attempt, where no deal row is (or should be) created.
 */
export async function logRiskFlag(flag) {
    await query(`INSERT INTO risk_flags (deal_id, user_id, flag_type, severity, details)
     VALUES ($1, $2, $3, $4, $5)`, [flag.dealId, flag.userId, flag.flagType, flag.severity, flag.details]);
}
/**
 * Route a deal to middleman review before funding (Requirement 9.2). Sets the
 * hold marker and risk score; the deal status itself is left untouched so the
 * state machine remains the single owner of status transitions.
 */
export async function applyMiddlemanReviewHold(client, dealId, riskScore) {
    await client.query(`UPDATE deals
        SET hold_status = $2, risk_score = $3, updated_at = now()
      WHERE id = $1`, [dealId, MIDDLEMAN_REVIEW_HOLD, riskScore]);
}
//# sourceMappingURL=deal-screening.repository.js.map