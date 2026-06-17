export interface ReleaseMilestoneInput {
    middlemanId: string;
    dealId: string;
    milestoneId: string;
    idempotencyKey: string;
}
export interface ReleaseMilestoneResult {
    milestoneId: string;
    releasedSmallestUnit: string;
    cumulativeReleasedSmallestUnit: string;
    isFinal: boolean;
    toState: string;
}
/** Release one milestone as the assigned middleman (money-moving, atomic). */
export declare function releaseMilestone(input: ReleaseMilestoneInput): Promise<ReleaseMilestoneResult>;
export interface MarkChecklistInput {
    middlemanId: string;
    dealId: string;
    checklistType: 'account_sale' | 'digital_product';
    itemKey: string;
    idempotencyKey: string;
}
/** Record a delivery-checklist item as completed (middleman-only, idempotent). */
export declare function markChecklistItem(input: MarkChecklistInput): Promise<{
    checked: boolean;
}>;
//# sourceMappingURL=milestone.service.d.ts.map