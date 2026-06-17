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

export const DEAL_STATUSES = [
  'Created',
  'Invited',
  'Agreed',
  'Verified',
  'Confirmed',
  'Amended',
  'Cancelled',
  'Funded',
  'SellerHandover',
  'MiddlemanVerified',
  'Delivered',
  'Approved',
  'PayoutQueued',
  'MilestoneReleased',
  'Released',
  'Disputed',
  'Refunded',
  'PartiallySettled',
  'Expired',
  'Paused',
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_EVENTS = [
  'SecureInviteSent',
  'PartiesAgreed',
  'CodeVerified',
  'TermsAccepted',
  'ChangeRequestApproved',
  'UpdatedTermsAccepted',
  'MutualCancellation',
  'FundsHeld',
  'SellerHandoverSent',
  'MiddlemanVerifiedTransfer',
  'DeliveredToBuyer',
  'BuyerApproved',
  'PayoutEnteredReview',
  'MilestoneReleased',
  'MoreMilestonesRemain',
  'FinalMilestoneReleased',
  'PayoutReleased',
  'ProblemRaised',
  'ResolveFullRefund',
  'ResolveFullRelease',
  'ResolvePartialSplit',
  'EmergencyPause',
  'Unpause',
  'FundingWindowExpired',
  'CompletionClockExpired',
  'InspectionWindowExpired',
] as const;

export type DealEvent = (typeof DEAL_EVENTS)[number];

/**
 * Authoritative allow-list. Each key is a current state; each inner key is an
 * event accepted in that state, mapping to the resulting state. Any
 * (state, event) pair absent here is rejected and leaves the deal unchanged.
 */
export const TRANSITIONS: Readonly<
  Record<DealStatus, Readonly<Partial<Record<DealEvent, DealStatus>>>>
> = {
  Created: { SecureInviteSent: 'Invited', EmergencyPause: 'Paused' },
  Invited: { PartiesAgreed: 'Agreed', EmergencyPause: 'Paused' },
  Agreed: { CodeVerified: 'Verified' },
  Verified: { TermsAccepted: 'Confirmed', FundingWindowExpired: 'Expired' },
  Confirmed: {
    ChangeRequestApproved: 'Amended',
    MutualCancellation: 'Cancelled',
    FundsHeld: 'Funded',
    EmergencyPause: 'Paused',
    FundingWindowExpired: 'Expired',
  },
  Amended: { UpdatedTermsAccepted: 'Confirmed' },
  Cancelled: {},
  Funded: {
    SellerHandoverSent: 'SellerHandover',
    ProblemRaised: 'Disputed',
    EmergencyPause: 'Paused',
    CompletionClockExpired: 'Expired',
  },
  SellerHandover: { MiddlemanVerifiedTransfer: 'MiddlemanVerified' },
  MiddlemanVerified: { DeliveredToBuyer: 'Delivered' },
  Delivered: {
    BuyerApproved: 'Approved',
    ProblemRaised: 'Disputed',
    // Req 14.8: buyer silence past the inspection window auto-releases to the
    // seller (treated as buyer approval), NOT an expiry/refund.
    InspectionWindowExpired: 'Approved',
  },
  Approved: { PayoutEnteredReview: 'PayoutQueued' },
  PayoutQueued: { MilestoneReleased: 'MilestoneReleased', PayoutReleased: 'Released' },
  MilestoneReleased: { MoreMilestonesRemain: 'PayoutQueued', FinalMilestoneReleased: 'Released' },
  Released: {},
  Disputed: {
    ResolveFullRefund: 'Refunded',
    ResolveFullRelease: 'Released',
    ResolvePartialSplit: 'PartiallySettled',
  },
  Refunded: {},
  PartiallySettled: {},
  Expired: {},
  Paused: { Unpause: 'Created' },
};

/** Resolve the destination state for (from, event), or null if undefined. */
export function nextState(from: DealStatus, event: DealEvent): DealStatus | null {
  return TRANSITIONS[from][event] ?? null;
}

/** True when (from, event) is a defined edge in the allow-list. */
export function canTransition(from: DealStatus, event: DealEvent): boolean {
  return nextState(from, event) !== null;
}

/** Terminal states have no outgoing edges. */
export function isTerminal(state: DealStatus): boolean {
  return Object.keys(TRANSITIONS[state]).length === 0;
}
