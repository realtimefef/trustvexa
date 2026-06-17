import type { TxClient } from './deal.repository.js';
/** Hold marker written to deals.hold_status when a deal needs middleman review. */
export declare const MIDDLEMAN_REVIEW_HOLD = "mm_review";
export interface RiskFlagInput {
    dealId: string | null;
    userId: string | null;
    flagType: string;
    severity: string;
    details: string;
}
/** Insert a risk flag inside an open transaction (deal being created). */
export declare function insertRiskFlag(client: TxClient, flag: RiskFlagInput): Promise<void>;
/**
 * Insert a risk flag with no open transaction. Used to record a blocked
 * creation attempt, where no deal row is (or should be) created.
 */
export declare function logRiskFlag(flag: RiskFlagInput): Promise<void>;
/**
 * Route a deal to middleman review before funding (Requirement 9.2). Sets the
 * hold marker and risk score; the deal status itself is left untouched so the
 * state machine remains the single owner of status transitions.
 */
export declare function applyMiddlemanReviewHold(client: TxClient, dealId: string, riskScore: number): Promise<void>;
//# sourceMappingURL=deal-screening.repository.d.ts.map