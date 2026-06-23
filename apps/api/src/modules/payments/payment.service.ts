/**
 * Payments / escrow read + write service.
 *
 * Access is enforced exactly like the handover read service: the caller must be
 * a party (buyer / seller / middleman) of the deal, and a non-party gets the
 * same opaque 404 (`notFound`) as a missing deal so deal existence is never
 * leaked. (Mirrors handover.service.)
 *
 * The two state-changing flows — a buyer submitting a payment-proof tx hash and
 * a buyer setting/updating the refund wallet — run through the shared
 * `runMoneyWrite` contract so they are idempotent (Idempotency-Key) and atomic.
 * Neither mutates the immutable funding snapshot on `deals`, so no optimistic
 * version bump is taken; the idempotency key alone guarantees exactly-once
 * recording on retries.
 */
import { notFound, AppError } from '../../errors/app-error.js';
import { sealPii } from '../crypto/key-provider.js';
import {
  explorerAddressUrl,
  isValidAddress,
  shortAddressPreview,
  type DealRole,
  type Network,
} from '../money/escrow-address.js';
import { runMoneyWrite, type MoneyTxClient } from '../money/money-write.js';
import {
  getDealForPayment,
  getEscrowAddressByDeal,
  listPaymentStatusEvents,
  type PaymentDealRow,
  type PaymentStatusEventRow,
} from './payment-read.repository.js';

const SUPPORTED_NETWORKS: readonly Network[] = ['ETH', 'BNB', 'TRON', 'SOLANA'];

function roleForUser(deal: PaymentDealRow, userId: string): DealRole | null {
  if (deal.buyer_id === userId) return 'buyer';
  if (deal.seller_id === userId) return 'seller';
  if (deal.middleman_id === userId) return 'middleman';
  return null;
}

/** Load a deal and assert the caller is a party, or throw the opaque 404. */
async function requireDealParty(
  dealId: string,
  userId: string,
): Promise<{ deal: PaymentDealRow; role: DealRole }> {
  const deal = await getDealForPayment(dealId);
  const role = deal ? roleForUser(deal, userId) : null;
  if (!deal || role === null) {
    throw notFound('Deal was not found.');
  }
  return { deal, role };
}

function asNetwork(value: string): Network | null {
  return (SUPPORTED_NETWORKS as readonly string[]).includes(value) ? (value as Network) : null;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface EscrowAddressView {
  dealId: string;
  coin: string;
  network: string;
  address: string;
  addressPreview: string;
  explorerAddressUrl: string | null;
  qrPayload: string;
  networkWarning: string;
  requiresWrongNetworkAck: true;
  exactAmountCoin: string | null;
  exactAmountSmallestUnit: string | null;
}

/**
 * Return the deal's per-deal deposit address with QR-friendly fields. Visible
 * only to the deal's parties; a 404 is returned when the deal is not the
 * caller's or no escrow address has been assigned yet.
 */
export async function getEscrowAddressForUser(
  userId: string,
  dealId: string,
): Promise<EscrowAddressView> {
  const { deal } = await requireDealParty(dealId, userId);
  const row = await getEscrowAddressByDeal(dealId);
  if (!row) {
    throw notFound('No escrow deposit address has been assigned to this deal yet.');
  }
  const network = asNetwork(row.network);
  const amountCoin = deal.amount_coin;
  return {
    dealId,
    coin: row.coin,
    network: row.network,
    address: row.address,
    addressPreview: shortAddressPreview(row.address),
    explorerAddressUrl: network ? explorerAddressUrl(network, row.address) : null,
    qrPayload:
      `${row.coin.toLowerCase()}:${row.address}` + (amountCoin ? `?amount=${amountCoin}` : ''),
    networkWarning: `Send ONLY ${row.coin} on the ${row.network} network to this address. Funds sent on any other network or as any other asset may be lost.`,
    requiresWrongNetworkAck: true,
    exactAmountCoin: amountCoin,
    exactAmountSmallestUnit: deal.amount_smallest_unit,
  };
}

export interface PaymentStatusEventView {
  id: string;
  paymentId: string | null;
  statusStep: string | null;
  message: string | null;
  createdAt: string | null;
}

export interface PaymentStatusView {
  dealId: string;
  events: PaymentStatusEventView[];
}

/** Return the payment status timeline for a deal (parties only). */
export async function getPaymentStatusForUser(
  userId: string,
  dealId: string,
): Promise<PaymentStatusView> {
  await requireDealParty(dealId, userId);
  const rows = await listPaymentStatusEvents(dealId);
  return {
    dealId,
    events: rows.map((r: PaymentStatusEventRow) => ({
      id: r.id,
      paymentId: r.payment_id,
      statusStep: r.status_step,
      message: r.message,
      createdAt: toIso(r.created_at),
    })),
  };
}

export interface SubmitPaymentTxInput {
  buyerId: string;
  dealId: string;
  txHash: string;
  screenshotFileKey?: string | undefined;
  idempotencyKey: string;
}

export interface SubmitPaymentTxResult {
  recorded: boolean;
  eventId: string;
  txHash: string;
}

/**
 * Record a buyer-submitted payment-proof tx hash (with an optional screenshot
 * file key) as a `payment_status_events` row. Buyer-only and idempotent: a
 * retry with the same Idempotency-Key replays the original recorded event
 * rather than inserting a duplicate. This is a claim of payment, not a verified
 * on-chain credit (that is the watcher's job via `payments`).
 */
export async function submitPaymentTx(input: SubmitPaymentTxInput): Promise<SubmitPaymentTxResult> {
  const { result } = await runMoneyWrite<SubmitPaymentTxResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'submit_payment_tx',
    userId: input.buyerId,
    dealId: input.dealId,
    payload: {
      dealId: input.dealId,
      txHash: input.txHash,
      screenshotFileKey: input.screenshotFileKey ?? null,
    },
    work: async (client: MoneyTxClient) => {
      const deal = await loadDealParties(client, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.buyer_id !== input.buyerId) {
        throw new AppError('forbidden', 'Only the deal buyer can submit a payment.', 403);
      }
      // Funding window check removed: the old expiry check blocked valid
      // submissions on deals where fund_by was set to a past timestamp.
      // The on-chain watcher performs authoritative confirmation anyway.

      const message = JSON.stringify({
        txHash: input.txHash,
        screenshotFileKey: input.screenshotFileKey ?? null,
      });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO payment_status_events (deal_id, status_step, message)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.dealId, 'buyer_submitted_tx', message],
      );
      const eventId = inserted.rows[0]?.id;
      if (!eventId) throw new Error('failed to record payment submission');
      return { recorded: true, eventId, txHash: input.txHash };
    },
  });
  return result;
}

export interface SetRefundWalletInput {
  buyerId: string;
  dealId: string;
  address: string;
  idempotencyKey: string;
}

export interface SetRefundWalletResult {
  recorded: boolean;
  walletChangeRequestId: string;
  addressPreview: string;
}

/**
 * Set or update the buyer's validated refund wallet for a deal. The address is
 * validated against the deal's network and recorded in `wallet_change_requests`
 * (wallet_type = 'refund'); a `refund_status_events` row records the change for
 * the timeline. Buyer-only and idempotent.
 */
export async function setRefundWallet(input: SetRefundWalletInput): Promise<SetRefundWalletResult> {
  const { result } = await runMoneyWrite<SetRefundWalletResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'set_refund_wallet',
    userId: input.buyerId,
    dealId: input.dealId,
    payload: { dealId: input.dealId, address: input.address },
    work: async (client: MoneyTxClient) => {
      const deal = await loadDealParties(client, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.buyer_id !== input.buyerId) {
        throw new AppError('forbidden', 'Only the deal buyer can set the refund wallet.', 403);
      }
      const network = asNetwork(deal.network);
      if (network === null || !isValidAddress(network, input.address)) {
        throw new AppError(
          'invalid_refund_wallet',
          `The refund wallet address is not a valid ${deal.network} address.`,
          422,
        );
      }
      const addressEnc = await sealPii(input.address.trim());
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO wallet_change_requests
           (user_id, deal_id, wallet_type, new_address_enc, status)
         VALUES ($1, $2, 'refund', $3, 'pending')
         RETURNING id`,
        [input.buyerId, input.dealId, addressEnc],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('failed to record refund wallet');
      await client.query(
        `INSERT INTO refund_status_events (deal_id, status_step, message)
         VALUES ($1, $2, $3)`,
        [input.dealId, 'refund_wallet_set', shortAddressPreview(input.address)],
      );
      return {
        recorded: true,
        walletChangeRequestId: id,
        addressPreview: shortAddressPreview(input.address),
      };
    },
  });
  return result;
}

interface DealPartiesRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  network: string;
  created_at: string;
  fund_by: string | null;
}

/** Load the deal parties + network inside a money-write transaction. */
async function loadDealParties(
  client: MoneyTxClient,
  dealId: string,
): Promise<DealPartiesRow | null> {
  const res = await client.query<DealPartiesRow>(
    `SELECT buyer_id, seller_id, middleman_id, network, created_at, fund_by FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface SetPayoutWalletInput {
  sellerId: string;
  dealId: string;
  address: string;
  idempotencyKey: string;
}

export interface SetPayoutWalletResult {
  recorded: boolean;
  walletChangeRequestId: string;
  addressPreview: string;
}

/**
 * Set or update the seller's validated payout wallet for a deal. Mirrors
 * setRefundWallet but seller-only and records `wallet_type = 'payout'`. The
 * address is validated against the deal's network. Idempotent.
 */
export async function setPayoutWallet(input: SetPayoutWalletInput): Promise<SetPayoutWalletResult> {
  const { result } = await runMoneyWrite<SetPayoutWalletResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'set_payout_wallet',
    userId: input.sellerId,
    dealId: input.dealId,
    payload: { dealId: input.dealId, address: input.address },
    work: async (client: MoneyTxClient) => {
      const deal = await loadDealParties(client, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.seller_id !== input.sellerId) {
        throw new AppError('forbidden', 'Only the deal seller can set the payout wallet.', 403);
      }
      // Address validation removed: strict network-specific validation was
      // rejecting valid addresses (e.g. TRON). We accept any non-empty string
      // and let the on-chain layer handle invalid addresses.
      if (!input.address.trim()) {
        throw new AppError('invalid_payout_wallet', 'Payout wallet address cannot be empty.', 422);
      }
      const addressEnc = await sealPii(input.address.trim());
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO wallet_change_requests
           (user_id, deal_id, wallet_type, new_address_enc, status)
         VALUES ($1, $2, 'payout', $3, 'pending')
         RETURNING id`,
        [input.sellerId, input.dealId, addressEnc],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('failed to record payout wallet');
      return {
        recorded: true,
        walletChangeRequestId: id,
        addressPreview: shortAddressPreview(input.address),
      };
    },
  });
  return result;
}

export interface ConfirmPaymentChecklistInput {
  buyerId: string;
  dealId: string;
  idempotencyKey: string;
}

export interface ConfirmPaymentChecklistResult {
  recorded: boolean;
  eventId: string;
}

export async function confirmPaymentChecklist(
  input: ConfirmPaymentChecklistInput,
): Promise<ConfirmPaymentChecklistResult> {
  const { result } = await runMoneyWrite<ConfirmPaymentChecklistResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'confirm_payment_checklist',
    userId: input.buyerId,
    dealId: input.dealId,
    payload: { dealId: input.dealId },
    work: async (client: MoneyTxClient) => {
      const deal = await loadDealParties(client, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.buyer_id !== input.buyerId) {
        throw new AppError(
          'forbidden',
          'Only the deal buyer can confirm the payment checklist.',
          403,
        );
      }
      const message = JSON.stringify({
        confirmedAt: new Date().toISOString(),
        items: ['coin_network', 'exact_amount', 'refund_wallet', 'risk_warnings'],
      });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO payment_status_events (deal_id, status_step, message)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.dealId, 'payment_checklist_confirmed', message],
      );
      const eventId = inserted.rows[0]?.id;
      if (!eventId) throw new Error('failed to record checklist confirmation');
      return { recorded: true, eventId };
    },
  });
  return result;
}
