/** A deal whose timer window has elapsed. */
export interface DueDeal {
    readonly id: string;
}
/** A completion-clock deal plus the party held responsible on timeout (14.3). */
export interface DueCompletionDeal extends DueDeal {
    readonly seller_id: string | null;
}
/**
 * Pre-funding deals whose funding window has elapsed (14.9). Outstanding
 * funding can sit in either `Verified` or `Confirmed`.
 */
export declare function findDueFundingWindowDeals(nowIso: string): Promise<DueDeal[]>;
/** Funded deals whose 3-day completion clock has elapsed (14.2). */
export declare function findDueCompletionClockDeals(nowIso: string): Promise<DueCompletionDeal[]>;
/** Delivered deals whose inspection window has elapsed (14.8 auto-release). */
export declare function findDueInspectionWindowDeals(nowIso: string): Promise<DueDeal[]>;
/**
 * Lower a user's trust on a missed deadline (14.3). Graduated trust
 * restrictions (task 7.6) are driven by `missed_deadline_count`; `trust_level`
 * is also nudged down but floored at 0 so it never goes negative.
 */
export declare function lowerUserTrust(userId: string): Promise<void>;
export declare function raiseUserTrust(userId: string): Promise<void>;
/** Start/refresh the funding window: when the buyer must fund by (14.9). */
export declare function setFundingWindow(dealId: string, fundByIso: string): Promise<void>;
/**
 * Start the completion clock when the middleman is contacted (14.1): record the
 * contact time and the 3-day deadline.
 */
export declare function setCompletionClock(dealId: string, contactedAtIso: string, completeByIso: string): Promise<void>;
/** Start the inspection window when the seller marks Delivered (14.6). */
export declare function setInspectionWindow(dealId: string, inspectionUntilIso: string): Promise<void>;
//# sourceMappingURL=lifecycle-timer.repository.d.ts.map