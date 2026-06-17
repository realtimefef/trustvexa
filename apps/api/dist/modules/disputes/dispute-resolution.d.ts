import type { DealEvent } from '../deal/state-machine.js';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'cancelled';
export type DisputeOutcome = 'full_refund' | 'full_release' | 'partial_split';
export interface SettlementSplit {
    /** Smallest-unit amount routed back to the buyer (refund). */
    toBuyer: bigint;
    /** Smallest-unit amount routed to the seller (release). */
    toSeller: bigint;
}
export type SettlementError = 'escrow_not_positive' | 'buyer_share_required' | 'buyer_share_out_of_range';
export declare class SettlementValidationError extends Error {
    readonly reason: SettlementError;
    constructor(reason: SettlementError);
}
export interface SettlementRequest {
    escrowAmount: bigint;
    outcome: DisputeOutcome;
    /** Required only for partial_split: smallest-unit amount returned to buyer. */
    buyerShare?: bigint;
}
/** Compute the exact split for a settlement. Throws on invalid inputs. */
export declare function computeSettlement(req: SettlementRequest): SettlementSplit;
/** Invariant guard: a settlement must fully and non-negatively distribute escrow. */
export declare function settlementBalances(escrowAmount: bigint, split: SettlementSplit): boolean;
/** Map a resolved outcome to the deal-state-machine event that effects it. */
export declare function resolutionEvent(outcome: DisputeOutcome): DealEvent;
/** Only a middleman may resolve, and only from an active dispute status. */
export declare function canResolveDispute(status: DisputeStatus, isMiddleman: boolean): boolean;
export interface EvidenceRecord {
    id: string;
    fileHash: string | null;
    lockedAt: string | null;
}
/** Evidence is hashed and locked at upload; locked evidence is immutable (Req 24.3). */
export declare function isEvidenceLocked(evidence: EvidenceRecord): boolean;
export declare function canModifyEvidence(evidence: EvidenceRecord): boolean;
//# sourceMappingURL=dispute-resolution.d.ts.map