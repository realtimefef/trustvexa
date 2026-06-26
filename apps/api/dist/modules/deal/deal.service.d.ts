import type { EscrowLogVisibility } from './deal.repository.js';
import type { DealEvent } from './state-machine.js';
export interface ApplyTransitionInput {
    readonly dealId: string;
    readonly event: DealEvent;
    /** Acting user URL, or null for system-initiated transitions (lifecycle timers). */
    readonly actorId: string | null;
    readonly requestId: string;
    readonly visibility?: EscrowLogVisibility;
}
export interface TransitionResult {
    readonly dealId: string;
    readonly from: string;
    readonly to: string;
    readonly event: DealEvent;
    readonly version: number;
    readonly entryHash: string;
}
/** Guard that an inbound event string is one of the defined escrow events. */
export declare function assertKnownEvent(event: string): asserts event is DealEvent;
/**
 * Apply a single escrow transition atomically. Resolves with the resulting
 * state and the new audit entry hash, or rejects with an `AppError`
 * (`deal_not_found`, `invalid_transition`, or `concurrent_update`).
 */
export declare function applyDealTransition(input: ApplyTransitionInput): Promise<TransitionResult>;
export declare function markDealDone(userId: string, dealId: string): Promise<{
    dealId: string;
    chatsClosed: number;
}>;
export interface RequestMiddlemanResult {
    dealId: string;
    middlemanId: string;
    alreadyAssigned: boolean;
}
/**
 * Attach a middleman to a deal in one click — no invite, no verification.
 * Either the buyer or seller may request it. If a middleman is already
 * assigned, the call is idempotent. Otherwise an active middleman account
 * (other than the two parties) is auto-assigned. The buyer<->mm and seller<->mm
 * chat rooms already exist from deal creation, so chat works immediately.
 */
export declare function requestMiddleman(userId: string, dealId: string): Promise<RequestMiddlemanResult>;
export interface AgreementResult {
    dealId: string;
    buyerAgreed: boolean;
    sellerAgreed: boolean;
    locked: boolean;
    lockedAt: string | null;
    /** Deal status after the agreement — 'Agreed' when both parties locked, else unchanged. */
    status: string;
}
/**
 * Mark the calling party's agreement on a deal. When BOTH the buyer and seller
 * have agreed the deal locks (immutable) AND the status advances to 'Agreed'
 * in the SAME transaction — so the caller sees the new status immediately
 * without needing a second round-trip. Idempotent: re-agreeing is a no-op.
 * Only the deal's buyer or seller may agree.
 */
export declare function agreeToDeal(userId: string, dealId: string): Promise<AgreementResult>;
export interface UpdateDealInput {
    dealAmountCents?: number;
    feePayer?: 'buyer' | 'seller' | 'split';
    feeSplitBuyerBps?: number | null;
    coin?: string;
    network?: string;
    itemDescription?: string | null;
    terms?: string | null;
}
export interface UpdateDealResult {
    dealId: string;
    updated: string[];
}
/**
 * Allow the seller to modify a deal's core parameters BEFORE both parties have
 * agreed (i.e. before locked_at is set). After locking the deal is immutable
 * for the parties; only the assigned middleman may adjust it post-lock.
 */
export declare function updateDeal(sellerId: string, dealId: string, input: UpdateDealInput): Promise<UpdateDealResult>;
export interface MiddlemanUpdateDealInput {
    /** The amount change, in integer USD cents (null = no change). */
    dealAmountCents?: number | null;
    /** Free-text terms override (null = no change). */
    terms?: string | null;
    /**
     * Explicit status override. Only a limited set of manual overrides are
     * accepted here so the middleman cannot skip required business logic — the
     * state-machine handles automated transitions. Allowed values:
     *   - 'Cancelled'  : middleman cancels a locked/funded deal
     *   - 'Disputed'   : middleman opens a formal dispute
     *   - 'Released'   : middleman releases funds (marks done)
     *   - 'Refunded'   : middleman issues a full refund
     */
    statusOverride?: 'Cancelled' | 'Disputed' | 'Released' | 'Refunded' | 'Funded' | null;
    /** Optional reason/note appended to the audit log. */
    note?: string | null;
}
export interface MiddlemanUpdateDealResult {
    dealId: string;
    amountChanged: boolean;
    termsChanged: boolean;
    statusChanged: boolean;
    newStatus: string | null;
}
/**
 * Allow the assigned middleman to modify a deal after it has been locked.
 * Only the deal's own middleman may call this; buyer and seller cannot.
 * Runs in a single transaction so partial updates are never committed.
 */
export declare function middlemanUpdateDeal(middlemanId: string, dealId: string, input: MiddlemanUpdateDealInput): Promise<MiddlemanUpdateDealResult>;
/**
 * Advance a deal that is stuck at SellerHandover / MiddlemanVerified with NO
 * middleman assigned, straight to Delivered. Either party (buyer or seller) may
 * trigger it. This unblocks deals that handed over before the auto-advance was
 * added, or any no-middleman deal. When a middleman IS assigned this is rejected
 * (the middleman must verify + deliver).
 */
export declare function advanceDeliveryNoMiddleman(userId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Middleman marks a deal complete — drives it through the remaining state
 * transitions to Released so both parties see the "Complete" stage. Used for
 * the simplified middleman-driven completion (Delivered → Released). Only the
 * deal's assigned middleman may call this. The real on-chain payout is handled
 * separately by the payout service; this advances the deal lifecycle status.
 */
export declare function markDealComplete(middlemanId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Buyer independently submits their case to the middleman. Sets only the
 * buyer-side flag — it does NOT change the escrow status or touch the seller's
 * side. Requires the deal to be funded and the buyer's receiving details saved.
 */
export declare function buyerSubmitToMiddleman(buyerId: string, dealId: string): Promise<{
    dealId: string;
    buyerSubmittedAt: string;
}>;
/**
 * Seller independently submits their case to the middleman. Sets only the
 * seller-side flag — it does NOT change the escrow status or touch the buyer's
 * side (the seller no longer advances the deal to Delivered themselves).
 * Requires the deal funded, a saved payout address and product/account details.
 */
export declare function sellerSubmitToMiddleman(sellerId: string, dealId: string): Promise<{
    dealId: string;
    sellerSubmittedAt: string;
}>;
/**
 * Manually advance a deal from Confirmed → Funded once the buyer has paid and
 * submitted their transaction hash. Buyer-only.
 */
export declare function confirmFunding(userId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Seller confirms they have delivered the item to the buyer (or initiated
 * the digital transfer). Transitions the deal Funded → SellerHandover.
 * Only the deal's seller may call this.
 */
export declare function sellerHandover(sellerId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Middleman confirms that the seller has completed the handover.
 * Transitions the deal from SellerHandover → MiddlemanVerified.
 * Only the deal's assigned middleman account may call this.
 */
export declare function verifyHandover(middlemanId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Middleman confirms delivery to the buyer.
 * Transitions MiddlemanVerified → Delivered.
 * Only the deal's assigned middleman account may call this.
 */
export declare function deliverToBuyer(middlemanId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
/**
 * Buyer approves the delivery, releasing funds.
 * Transitions Delivered → Approved.
 * Only the deal's buyer may call this.
 */
export declare function approveDeal(buyerId: string, dealId: string, requestId: string): Promise<{
    dealId: string;
    status: string;
}>;
export declare function updateDealTags(userId: string, dealId: string, tags: string[]): Promise<void>;
//# sourceMappingURL=deal.service.d.ts.map