// Buyer/seller action center + activity timeline (task 7.1). Pure: given a deal
// snapshot it returns the prioritized "what to do next" per role and an
// ordered, projected timeline. Uses the authoritative deal states.
// (Requirements 37.4, 48.5, 36.1)
const NONE = [];
function buyerAction(status) {
    switch (status) {
        case 'Created':
        case 'Invited':
            return [
                { code: 'accept_invite', label: 'Review and accept the deal invite', blocking: true },
            ];
        case 'Agreed':
            return [
                { code: 'verify_code', label: 'Confirm the secure verification code', blocking: true },
            ];
        case 'Verified':
        case 'Confirmed':
            return [{ code: 'fund_escrow', label: 'Fund the escrow to start the deal', blocking: true }];
        case 'Delivered':
            return [
                {
                    code: 'inspect_delivery',
                    label: 'Inspect the delivery and approve or dispute',
                    blocking: true,
                },
            ];
        case 'Disputed':
            return [{ code: 'submit_evidence', label: 'Add evidence for the dispute', blocking: false }];
        default:
            return NONE;
    }
}
function sellerAction(status) {
    switch (status) {
        case 'Created':
        case 'Invited':
            return [
                { code: 'accept_invite', label: 'Review and accept the deal invite', blocking: true },
            ];
        case 'Funded':
            return [
                { code: 'send_handover', label: 'Hand over the goods or credentials', blocking: true },
            ];
        case 'Disputed':
            return [{ code: 'submit_evidence', label: 'Add evidence for the dispute', blocking: false }];
        case 'Released':
        case 'MilestoneReleased':
            return [
                { code: 'leave_review', label: 'Leave a review for your counterparty', blocking: false },
            ];
        default:
            return NONE;
    }
}
function middlemanAction(status) {
    switch (status) {
        case 'SellerHandover':
            return [{ code: 'verify_transfer', label: 'Verify the seller handover', blocking: true }];
        case 'MiddlemanVerified':
            return [{ code: 'release_to_buyer', label: 'Deliver to the buyer', blocking: true }];
        case 'Approved':
        case 'PayoutQueued':
            return [{ code: 'release_payout', label: 'Release the seller payout', blocking: true }];
        case 'Disputed':
            return [
                {
                    code: 'resolve_dispute',
                    label: 'Review evidence and resolve the dispute',
                    blocking: true,
                },
            ];
        default:
            return NONE;
    }
}
/** Compute the action center entries for a role at a given deal state. */
export function nextActionsFor(role, status) {
    switch (role) {
        case 'buyer':
            return buyerAction(status);
        case 'seller':
            return sellerAction(status);
        case 'middleman':
            return middlemanAction(status);
    }
}
/** Whether this role is currently the blocker for the deal's progress. */
export function isWaitingOn(role, status) {
    return nextActionsFor(role, status).some((a) => a.blocking);
}
/** Sort raw timeline rows oldest-first for display/export (Req 37.4). */
export function orderTimeline(entries) {
    return [...entries].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
//# sourceMappingURL=action-center.js.map