export type PayoutQueueStatus = 'pending' | 'awaiting_second_signature' | 'approved' | 'broadcast' | 'confirmed' | 'cancelled';
export interface PayoutApprovalState {
    status: PayoutQueueStatus;
    approvers: readonly string[];
}
export declare class PayoutQueueError extends Error {
    constructor(message: string);
}
export declare function initialPayoutState(): PayoutApprovalState;
/** Add a distinct signer. Two signatures move the payout to `approved`. */
export declare function addApproval(state: PayoutApprovalState, signerId: string): PayoutApprovalState;
export declare function markBroadcast(state: PayoutApprovalState): PayoutApprovalState;
export declare function markConfirmed(state: PayoutApprovalState): PayoutApprovalState;
export declare function cancel(state: PayoutApprovalState): PayoutApprovalState;
export declare function isFullyAuthorized(state: PayoutApprovalState): boolean;
export type RefundCause = 'platform_fault' | 'seller_no_delivery' | 'dispute_buyer_favor' | 'buyer_cancel' | 'mutual_cancel';
export declare function refundFeeSmallestUnit(cause: RefundCause, gasCostSmallestUnit: bigint): bigint;
export declare function refundAmountSmallestUnit(escrowedSmallestUnit: bigint, cause: RefundCause, gasCostSmallestUnit: bigint): bigint;
//# sourceMappingURL=payout-queue.d.ts.map