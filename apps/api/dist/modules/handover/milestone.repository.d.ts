export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface MilestoneDealRow {
    id: string;
    middleman_id: string | null;
    status: string;
    coin: string;
    network: string;
    amount_smallest_unit: string | null;
    version_no: number;
}
/** Lock the deal row for the duration of the milestone-release transaction. */
export declare function lockDeal(tx: TxClient, dealId: string): Promise<MilestoneDealRow | null>;
export interface MilestoneRow {
    id: string;
    deal_id: string;
    amount_smallest_unit: string | null;
    status: string | null;
}
/** Read one milestone scoped to its deal. */
export declare function getMilestone(tx: TxClient, dealId: string, milestoneId: string): Promise<MilestoneRow | null>;
/** Sum the amounts of milestones already released for a deal (smallest units). */
export declare function sumReleasedMilestones(tx: TxClient, dealId: string): Promise<bigint>;
export interface ChecklistRow {
    item_key: string;
    checked_at: string | null;
}
/** List the delivery checklist rows for a deal (every row is a required item). */
export declare function listDeliveryChecklist(tx: TxClient, dealId: string): Promise<ChecklistRow[]>;
/** Mark a milestone released under an optimistic guard (only if not already released). */
export declare function markMilestoneReleased(tx: TxClient, milestoneId: string): Promise<number>;
/** Transition a deal's status under an optimistic guard on its current state. */
export declare function setDealStatusFrom(tx: TxClient, dealId: string, fromStatus: string, toStatus: string): Promise<number>;
/**
 * Record a delivery-checklist item as completed (proof submitted). Upserts the
 * `(deal_id, checklist_type, item_key)` row, stamping `checked_by`/`checked_at`
 * so `listDeliveryChecklist` can treat it as done.
 */
export declare function markDeliveryChecklistItem(tx: TxClient, input: {
    dealId: string;
    checklistType: string;
    itemKey: string;
    checkedBy: string;
}): Promise<void>;
//# sourceMappingURL=milestone.repository.d.ts.map