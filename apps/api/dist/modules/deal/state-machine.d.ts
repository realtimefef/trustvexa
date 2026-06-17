/**
 * Escrow state machine (Plan §4 / design §4) — Task 4.9 core.
 *
 * The deal lifecycle is a finite state machine. `TRANSITIONS` is the single,
 * static allow-list of every defined (fromState, event) -> toState edge,
 * reproduced exactly from the authoritative transition table. Transition
 * decisions are pure and server-authoritative; the deal service wraps a planned
 * transition in one DB transaction (optimistic lock + atomic escrow_logs).
 * (Requirements 13.1–13.3)
 */
export declare const DEAL_STATUSES: readonly ["Created", "Invited", "Agreed", "Verified", "Confirmed", "Amended", "Cancelled", "Funded", "SellerHandover", "MiddlemanVerified", "Delivered", "Approved", "PayoutQueued", "MilestoneReleased", "Released", "Disputed", "Refunded", "PartiallySettled", "Expired", "Paused"];
export type DealStatus = (typeof DEAL_STATUSES)[number];
export declare const DEAL_EVENTS: readonly ["SecureInviteSent", "PartiesAgreed", "CodeVerified", "TermsAccepted", "ChangeRequestApproved", "UpdatedTermsAccepted", "MutualCancellation", "FundsHeld", "SellerHandoverSent", "MiddlemanVerifiedTransfer", "DeliveredToBuyer", "BuyerApproved", "PayoutEnteredReview", "MilestoneReleased", "MoreMilestonesRemain", "FinalMilestoneReleased", "PayoutReleased", "ProblemRaised", "ResolveFullRefund", "ResolveFullRelease", "ResolvePartialSplit", "EmergencyPause", "Unpause", "FundingWindowExpired", "CompletionClockExpired", "InspectionWindowExpired"];
export type DealEvent = (typeof DEAL_EVENTS)[number];
/**
 * Authoritative allow-list. Each key is a current state; each inner key is an
 * event accepted in that state, mapping to the resulting state. Any
 * (state, event) pair absent here is rejected and leaves the deal unchanged.
 */
export declare const TRANSITIONS: Readonly<Record<DealStatus, Readonly<Partial<Record<DealEvent, DealStatus>>>>>;
/** Resolve the destination state for (from, event), or null if undefined. */
export declare function nextState(from: DealStatus, event: DealEvent): DealStatus | null;
/** True when (from, event) is a defined edge in the allow-list. */
export declare function canTransition(from: DealStatus, event: DealEvent): boolean;
/** Terminal states have no outgoing edges. */
export declare function isTerminal(state: DealStatus): boolean;
//# sourceMappingURL=state-machine.d.ts.map