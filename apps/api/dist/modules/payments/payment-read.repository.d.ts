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
export declare function getDealForPayment(dealId: string): Promise<PaymentDealRow | null>;
export interface EscrowAddressRow {
    coin: string;
    network: string;
    address: string;
    derivation_index: number | null;
}
/** The deal's single escrow deposit address (public address only, no secrets). */
export declare function getEscrowAddressByDeal(dealId: string): Promise<EscrowAddressRow | null>;
export interface PaymentStatusEventRow {
    id: string;
    payment_id: string | null;
    status_step: string | null;
    message: string | null;
    created_at: Date | string;
}
/** The deal's payment status timeline, oldest first. */
export declare function listPaymentStatusEvents(dealId: string): Promise<PaymentStatusEventRow[]>;
/** Latest saved wallet address (encrypted) for a deal + wallet type. */
export declare function getLatestWalletEnc(dealId: string, walletType: 'payout' | 'refund'): Promise<string | null>;
//# sourceMappingURL=payment-read.repository.d.ts.map