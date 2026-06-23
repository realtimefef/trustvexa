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
export declare function getEscrowAddressForUser(userId: string, dealId: string): Promise<EscrowAddressView>;
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
    /** Seller's saved payout wallet address (decrypted, full) — null if not set. */
    payoutAddress: string | null;
    /** Buyer's most recently submitted transaction hash — null if none. */
    submittedTxHash: string | null;
}
/** Return the payment status timeline for a deal (parties only). */
export declare function getPaymentStatusForUser(userId: string, dealId: string): Promise<PaymentStatusView>;
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
export declare function submitPaymentTx(input: SubmitPaymentTxInput): Promise<SubmitPaymentTxResult>;
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
export declare function setRefundWallet(input: SetRefundWalletInput): Promise<SetRefundWalletResult>;
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
export declare function setPayoutWallet(input: SetPayoutWalletInput): Promise<SetPayoutWalletResult>;
export interface ConfirmPaymentChecklistInput {
    buyerId: string;
    dealId: string;
    idempotencyKey: string;
}
export interface ConfirmPaymentChecklistResult {
    recorded: boolean;
    eventId: string;
}
export declare function confirmPaymentChecklist(input: ConfirmPaymentChecklistInput): Promise<ConfirmPaymentChecklistResult>;
//# sourceMappingURL=payment.service.d.ts.map