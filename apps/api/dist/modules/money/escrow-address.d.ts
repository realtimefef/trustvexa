export type Network = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export type DealRole = 'buyer' | 'seller' | 'middleman';
export declare function isValidAddress(network: Network, address: string): boolean;
/** Abbreviated address for safe visual confirmation, e.g. 0x1234…5678. */
export declare function shortAddressPreview(address: string, lead?: number, tail?: number): string;
export declare function explorerAddressUrl(network: Network, address: string): string;
export declare function explorerTxUrl(network: Network, txHash: string): string;
export interface DealParties {
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
}
/** Escrow address + explorer links are visible only to the deal's parties. */
export declare function canViewEscrowAddress(viewerUserId: string, deal: DealParties): boolean;
export interface PaymentInstructionInput {
    coin: string;
    network: Network;
    address: string;
    amountCoin: string;
    amountSmallestUnit: bigint;
}
export interface PaymentInstructions {
    coin: string;
    network: Network;
    address: string;
    addressPreview: string;
    exactAmountCoin: string;
    exactAmountSmallestUnit: string;
    networkWarning: string;
    requiresWrongNetworkAck: true;
    qrPayload: string;
    explorerAddressUrl: string;
}
export declare function buildPaymentInstructions(input: PaymentInstructionInput): PaymentInstructions;
//# sourceMappingURL=escrow-address.d.ts.map