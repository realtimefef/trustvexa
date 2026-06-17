/**
 * Read-side access for the payments/escrow HTTP surface.
 *
 * Projections are limited to the columns that exist in the deals / escrow /
 * payment-event migrations (see packages/db/migrations/1700000200000_*):
 *   - deals: parties + the immutable funding snapshot fields used to render the
 *     deposit instructions (coin, network, amount_coin, amount_smallest_unit).
 *   - payment_status_events: the per-deal status timeline (status_step,
 *     message, created_at) — never any secret payload.
 *
 * Money/state writes (tx submission, refund wallet) live in the service and run
 * through `runMoneyWrite`; this module is read-only.
 */
import { query } from '@trustvexa/shared';
/** The deal's parties + funding snapshot, for access checks and deposit display. */
export async function getDealForPayment(dealId) {
    const res = await query(`SELECT buyer_id, seller_id, middleman_id, coin, network,
            amount_coin, amount_smallest_unit, status
       FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
/** The deal's single escrow deposit address (public address only, no secrets). */
export async function getEscrowAddressByDeal(dealId) {
    const res = await query(`SELECT coin, network, address, derivation_index
       FROM escrow_addresses WHERE deal_id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
/** The deal's payment status timeline, oldest first. */
export async function listPaymentStatusEvents(dealId) {
    const res = await query(`SELECT id, payment_id, status_step, message, created_at
       FROM payment_status_events
      WHERE deal_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT 200`, [dealId]);
    return res.rows;
}
//# sourceMappingURL=payment-read.repository.js.map