export declare const ACCOUNT_LABELS: readonly ["new_user", "good_standing", "trusted", "high_risk", "under_review", "blocked", "middleman_verified"];
export type AccountLabel = (typeof ACCOUNT_LABELS)[number];
export declare const RESTRICTION_KINDS: readonly ["none", "warning", "soft_limit", "temporary_block", "manual_review_block"];
export type RestrictionKind = (typeof RESTRICTION_KINDS)[number];
export declare const SOFT_LIMIT_MAX_ACTIVE_DEALS = 1;
export declare const SOFT_LIMIT_COOLDOWN_HOURS = 24;
export declare const TEMPORARY_BLOCK_DAYS = 7;
export interface TrustRestriction {
    kind: RestrictionKind;
    missedDeadlineCount: number;
    /** True when the user may not open new deals at all. */
    blockNewDeals: boolean;
    /** Cap on simultaneous active deals; null means unlimited. */
    maxActiveDeals: number | null;
    cooldownHours: number | null;
    temporaryBlockDays: number | null;
    /** True when only a middleman can lift the restriction. */
    requiresMiddlemanReinstate: boolean;
}
export interface RestrictionInput {
    missedDeadlineCount: number;
    fraud?: boolean;
}
/**
 * Resolve the restriction for a given missed-deadline count.
 *  - 0 misses: none
 *  - 1st miss: friendly warning only (Req 26.2)
 *  - 2nd miss: soft limit of one active deal + short cooldown (Req 26.3)
 *  - 3rd miss: temporary ~7-day block on new deals (Req 26.4)
 *  - 4th miss or fraud: block until a middleman reinstates (Req 26.5)
 */
export declare function restrictionFor(input: RestrictionInput): TrustRestriction;
/** Relative severity, used to assert monotonic escalation. */
export declare function severityRank(kind: RestrictionKind): number;
/** The consequence the user is warned about before the next miss (Req 26.8). */
export declare function nextConsequence(currentMissedCount: number): TrustRestriction;
/** Whether a user may open a new deal given the active restriction. */
export declare function canCreateDeal(restriction: TrustRestriction, currentActiveDeals: number): boolean;
export type AppealDecision = 'reinstate' | 'keep_blocked' | 'cooldown';
export interface AppealOutcome {
    blockNewDeals: boolean;
    cooldownHours: number | null;
    resolvedLabel: AccountLabel;
}
/** Apply the single controlled appeal decision recorded by the middleman (Req 26.10). */
export declare function applyAppeal(decision: AppealDecision, cooldownHours?: number): AppealOutcome;
//# sourceMappingURL=trust-restrictions.d.ts.map