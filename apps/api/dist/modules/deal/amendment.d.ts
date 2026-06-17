/**
 * Pure decision helpers for amendments and mutual cancellation (task 4.8,
 * Requirement 12). Side-effect free so they can be property-tested and reused
 * by the service without a database.
 *
 *  - A change request needs BOTH parties' approval (12.1); money/product
 *    changes additionally need the middleman (12.2).
 *  - A mutual cancellation needs both parties' approval (12.4); a single
 *    refusal is routed to the middleman (12.5).
 *  - Whether a deal is still pre-funding decides mutual-cancel vs. the
 *    refund/dispute flow (12.6).
 */
/** Change types whose approval additionally requires the middleman (12.2). */
export declare const MONEY_PRODUCT_CHANGE_TYPES: readonly ["amount", "product", "fee_payer", "coin", "network"];
export declare const CHANGE_TYPES: readonly ["amount", "product", "fee_payer", "coin", "network", "terms", "inspection_window", "other"];
export type ChangeType = (typeof CHANGE_TYPES)[number];
export declare function requiresMiddlemanApproval(changeType: string): boolean;
export interface AmendmentApprovalState {
    buyerApprovedAt: string | null;
    sellerApprovedAt: string | null;
    middlemanApprovedAt: string | null;
}
export declare function isAmendmentFullyApproved(approval: AmendmentApprovalState, needsMiddleman: boolean): boolean;
export interface CancellationApprovalState {
    buyerApprovedAt: string | null;
    sellerApprovedAt: string | null;
}
export declare function isCancellationMutuallyApproved(approval: CancellationApprovalState): boolean;
/** Statuses before any on-chain funds are held. */
export declare const PRE_FUNDING_STATUSES: readonly ["Created", "Invited", "Agreed", "Verified", "Confirmed"];
/** Funded-or-later but still active statuses → cancellation routes to dispute (12.6). */
export declare const FUNDED_ACTIVE_STATUSES: readonly ["Funded", "SellerHandover", "MiddlemanVerified", "Delivered", "Approved", "PayoutQueued", "MilestoneReleased", "Disputed"];
export declare function isPreFunding(status: string): boolean;
export declare function isFundedActive(status: string): boolean;
//# sourceMappingURL=amendment.d.ts.map