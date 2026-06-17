import type { DealStatus } from '../deal/state-machine.js';
/** A deal assigned to the middleman, projected for the work queue. */
export interface MiddlemanDealRow {
    id: string;
    status: DealStatus;
    risk_score: number | null;
    deal_amount: string | null;
    coin: string;
    network: string;
    is_practice: boolean;
    hold_status: string | null;
    last_activity_at: Date | string | null;
    fund_by: Date | string | null;
    complete_by: Date | string | null;
}
/** Every deal the middleman is assigned to, most-recently-active first. */
export declare function listMiddlemanQueue(userId: string): Promise<MiddlemanDealRow[]>;
/** An open dispute on one of the middleman's deals. */
export interface AdminDisputeRow {
    id: string;
    deal_id: string;
    reason: string | null;
    status: string;
    created_at: Date | string;
    deal_status: DealStatus;
    coin: string;
    network: string;
}
/** Open / under-review disputes for deals this middleman handles. */
export declare function listOpenDisputesForMiddleman(userId: string): Promise<AdminDisputeRow[]>;
//# sourceMappingURL=admin-read.repository.d.ts.map