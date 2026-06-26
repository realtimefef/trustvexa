/**
 * Operator (admin == middleman account) deal-claim helper.
 *
 * The platform runs with a single operator who manages every deal. When that
 * operator takes a middleman control action (verify/confirm a side, verify the
 * handover, deliver, complete, open/remove a dispute, cancel) on a deal that
 * has NO middleman assigned yet, we claim them as the deal's middleman so the
 * action is authorized AND the deal is correctly tied to its operator. This
 * removes the inconsistent state where an operator could open a no-middleman
 * deal but every control action failed with a 403.
 *
 * No-op for:
 *   - non-operator callers (regular buyer/seller accounts), and
 *   - deals that already have a middleman assigned (the `IS NULL` guard never
 *     steals an already-assigned deal).
 */
import { query } from '@trustvexa/shared';
/** True when the user account is an operator (middleman) account. */
export async function isOperatorAccount(userId) {
    const res = await query(`SELECT account_type FROM users WHERE id = $1 LIMIT 1`, [userId]);
    return res.rows[0]?.account_type === 'middleman';
}
/**
 * If `userId` is an operator and the deal has no middleman yet, assign them as
 * the deal's middleman (and sync the linked connection so the chat reflects it).
 * Safe to call before any middleman control action; it is idempotent and only
 * ever fills an empty middleman slot.
 */
export async function claimDealForOperator(userId, dealId) {
    if (!(await isOperatorAccount(userId)))
        return;
    await query(`UPDATE deals SET middleman_id = $1, updated_at = now()
      WHERE id = $2 AND middleman_id IS NULL`, [userId, dealId]);
    // Keep any linked connection (the deal chat) in sync so the operator shows as
    // the middleman there too and the mm channels become usable.
    await query(`UPDATE connections SET middleman_id = $1, updated_at = now()
      WHERE deal_id = $2 AND middleman_id IS NULL`, [userId, dealId]);
}
//# sourceMappingURL=operator-claim.js.map