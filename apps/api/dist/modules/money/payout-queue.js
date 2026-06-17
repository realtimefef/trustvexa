// Payout queue two-step signing and cause-based refund fee rules (task 5.23).
// Pure state transitions; persistence (payout_queue, version_no) lives in the
// repository. A payout cannot broadcast without two distinct signatures.
// (Requirements 22.1, 22.2, 22.12, 22.13)
export class PayoutQueueError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PayoutQueueError';
    }
}
export function initialPayoutState() {
    return { status: 'pending', approvers: [] };
}
/** Add a distinct signer. Two signatures move the payout to `approved`. */
export function addApproval(state, signerId) {
    if (state.status !== 'pending' && state.status !== 'awaiting_second_signature') {
        throw new PayoutQueueError(`cannot sign a payout in status ${state.status}`);
    }
    if (state.approvers.includes(signerId)) {
        throw new PayoutQueueError('a signer cannot approve the same payout twice');
    }
    const approvers = [...state.approvers, signerId];
    const status = approvers.length >= 2 ? 'approved' : 'awaiting_second_signature';
    return { status, approvers };
}
export function markBroadcast(state) {
    if (state.status !== 'approved') {
        throw new PayoutQueueError('only an approved payout can broadcast');
    }
    return { ...state, status: 'broadcast' };
}
export function markConfirmed(state) {
    if (state.status !== 'broadcast') {
        throw new PayoutQueueError('only a broadcast payout can confirm');
    }
    return { ...state, status: 'confirmed' };
}
export function cancel(state) {
    if (state.status === 'broadcast' || state.status === 'confirmed') {
        throw new PayoutQueueError('cannot cancel a payout that already broadcast');
    }
    return { ...state, status: 'cancelled' };
}
export function isFullyAuthorized(state) {
    return state.status === 'approved' && new Set(state.approvers).size >= 2;
}
export function refundFeeSmallestUnit(cause, gasCostSmallestUnit) {
    switch (cause) {
        case 'platform_fault':
        case 'seller_no_delivery':
        case 'dispute_buyer_favor':
            return 0n;
        case 'buyer_cancel':
        case 'mutual_cancel':
            return gasCostSmallestUnit < 0n ? 0n : gasCostSmallestUnit;
    }
}
export function refundAmountSmallestUnit(escrowedSmallestUnit, cause, gasCostSmallestUnit) {
    const fee = refundFeeSmallestUnit(cause, gasCostSmallestUnit);
    const amount = escrowedSmallestUnit - fee;
    return amount < 0n ? 0n : amount;
}
//# sourceMappingURL=payout-queue.js.map