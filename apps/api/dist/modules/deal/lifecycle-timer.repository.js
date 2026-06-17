/**
 * Lifecycle-timer data access (task 4.13, Requirement 14).
 *
 * Pure SQL helpers the timer service uses to (a) find deals whose SLA windows
 * have elapsed and (b) start/refresh those windows. Detection queries are
 * status-scoped, so the state machine's own rules keep them correct: a disputed
 * deal has left `Funded`, so its completion clock is naturally paused (14.5),
 * and legally-held deals are excluded defensively so automation never expires a
 * deal under compliance review. All times are supplied by the caller, so the
 * engine stays deterministic under a mocked clock (task 4.14).
 */
import { query } from '@trustvexa/shared';
const DUE_BATCH_LIMIT = 500;
/**
 * Pre-funding deals whose funding window has elapsed (14.9). Outstanding
 * funding can sit in either `Verified` or `Confirmed`.
 */
export async function findDueFundingWindowDeals(nowIso) {
    const res = await query(`SELECT id FROM deals
      WHERE status IN ('Verified', 'Confirmed')
        AND legal_hold = false
        AND fund_by IS NOT NULL
        AND fund_by <= $1
      ORDER BY fund_by ASC
      LIMIT ${DUE_BATCH_LIMIT}`, [nowIso]);
    return res.rows;
}
/** Funded deals whose 3-day completion clock has elapsed (14.2). */
export async function findDueCompletionClockDeals(nowIso) {
    const res = await query(`SELECT id, seller_id FROM deals
      WHERE status = 'Funded'
        AND legal_hold = false
        AND complete_by IS NOT NULL
        AND complete_by <= $1
      ORDER BY complete_by ASC
      LIMIT ${DUE_BATCH_LIMIT}`, [nowIso]);
    return res.rows;
}
/** Delivered deals whose inspection window has elapsed (14.8 auto-release). */
export async function findDueInspectionWindowDeals(nowIso) {
    const res = await query(`SELECT id FROM deals
      WHERE status = 'Delivered'
        AND legal_hold = false
        AND inspection_until IS NOT NULL
        AND inspection_until <= $1
      ORDER BY inspection_until ASC
      LIMIT ${DUE_BATCH_LIMIT}`, [nowIso]);
    return res.rows;
}
/**
 * Lower a user's trust on a missed deadline (14.3). Graduated trust
 * restrictions (task 7.6) are driven by `missed_deadline_count`; `trust_level`
 * is also nudged down but floored at 0 so it never goes negative.
 */
export async function lowerUserTrust(userId) {
    await query(`UPDATE users
        SET missed_deadline_count = missed_deadline_count + 1,
            trust_level = GREATEST(trust_level - 1, 0)
      WHERE id = $1`, [userId]);
}
export async function raiseUserTrust(userId) {
    await query(`UPDATE users
        SET trust_level = LEAST(trust_level + 1, 5)
      WHERE id = $1`, [userId]);
}
/** Start/refresh the funding window: when the buyer must fund by (14.9). */
export async function setFundingWindow(dealId, fundByIso) {
    await query(`UPDATE deals SET fund_by = $2 WHERE id = $1`, [dealId, fundByIso]);
}
/**
 * Start the completion clock when the middleman is contacted (14.1): record the
 * contact time and the 3-day deadline.
 */
export async function setCompletionClock(dealId, contactedAtIso, completeByIso) {
    await query(`UPDATE deals SET mm_contacted_at = $2, complete_by = $3 WHERE id = $1`, [
        dealId,
        contactedAtIso,
        completeByIso,
    ]);
}
/** Start the inspection window when the seller marks Delivered (14.6). */
export async function setInspectionWindow(dealId, inspectionUntilIso) {
    await query(`UPDATE deals SET inspection_until = $2 WHERE id = $1`, [dealId, inspectionUntilIso]);
}
//# sourceMappingURL=lifecycle-timer.repository.js.map