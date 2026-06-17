export type RevealStatus = 'middleman_only' | 'revealed_to_buyer' | 'revoked';
export interface ChecklistItem {
    code: string;
    required: boolean;
    done: boolean;
}
/** A checklist is satisfied when every required item is done. */
export declare function isChecklistComplete(items: ReadonlyArray<ChecklistItem>): boolean;
export declare function pendingRequired(items: ReadonlyArray<ChecklistItem>): ChecklistItem[];
export interface Milestone {
    id: string;
    amount: bigint;
    released: boolean;
}
export type MilestoneReleaseError = 'already_released' | 'checklist_incomplete' | 'not_middleman' | 'exceeds_escrow';
export interface MilestoneReleaseInput {
    milestone: Milestone;
    checklist: ReadonlyArray<ChecklistItem>;
    isMiddleman: boolean;
    escrowAmount: bigint;
    alreadyReleased: bigint;
}
export interface MilestoneReleaseDecision {
    ok: boolean;
    error?: MilestoneReleaseError;
    /** Cumulative released amount if this release proceeds. */
    nextReleasedTotal: bigint;
    /** True when this release exhausts the escrow (final milestone). */
    isFinal: boolean;
}
export declare function evaluateMilestoneRelease(input: MilestoneReleaseInput): MilestoneReleaseDecision;
/** Buyer may see revealed credentials only after the middleman reveals them. */
export declare function canBuyerReveal(status: RevealStatus): boolean;
//# sourceMappingURL=milestones.d.ts.map