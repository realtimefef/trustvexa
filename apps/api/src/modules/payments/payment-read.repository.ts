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

export interface PaymentDealRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  coin: string;
  network: string;
  amount_coin: string | null;
  amount_smallest_unit: string | null;
  status: string;
}

/** The deal's parties + funding snapshot, for access checks and deposit display. */
export async function getDealForPayment(dealId: string): Promise<PaymentDealRow | null> {
  const res = await query<PaymentDealRow>(
    `SELECT buyer_id, seller_id, middleman_id, coin, network,
            amount_coin, amount_smallest_unit, status
       FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface EscrowAddressRow {
  coin: string;
  network: string;
  address: string;
  derivation_index: number | null;
}

/** The deal's single escrow deposit address (public address only, no secrets). */
export async function getEscrowAddressByDeal(dealId: string): Promise<EscrowAddressRow | null> {
  const res = await query<EscrowAddressRow>(
    `SELECT coin, network, address, derivation_index
       FROM escrow_addresses WHERE deal_id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface PaymentStatusEventRow {
  id: string;
  payment_id: string | null;
  status_step: string | null;
  message: string | null;
  created_at: Date | string;
}

/** The deal's payment status timeline, oldest first. */
export async function listPaymentStatusEvents(dealId: string): Promise<PaymentStatusEventRow[]> {
  const res = await query<PaymentStatusEventRow>(
    `SELECT id, payment_id, status_step, message, created_at
       FROM payment_status_events
      WHERE deal_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT 200`,
    [dealId],
  );
  return res.rows;
}

/** Latest saved wallet address (encrypted) for a deal + wallet type. */
export async function getLatestWalletEnc(
  dealId: string,
  walletType: 'payout' | 'refund',
): Promise<string | null> {
  const res = await query<{ new_address_enc: string }>(
    `SELECT new_address_enc
       FROM wallet_change_requests
      WHERE deal_id = $1 AND wallet_type = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [dealId, walletType],
  );
  return res.rows[0]?.new_address_enc ?? null;
}
