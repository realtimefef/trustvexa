import type { NextAction } from '../dashboard/action-center.js';
import type { DealStatus } from '../deal/state-machine.js';
export interface QueueItem {
    id: string;
    status: DealStatus;
    riskScore: number | null;
    dealAmountCents: string | null;
    coin: string;
    network: string;
    isPractice: boolean;
    holdStatus: string | null;
    lastActivityAt: string | null;
    fundBy: string | null;
    completeBy: string | null;
    nextActions: readonly NextAction[];
    waitingOnMiddleman: boolean;
}
export interface QueueSummary {
    total: number;
    waiting: number;
    onHold: number;
}
export interface AdminDispute {
    id: string;
    dealId: string;
    reason: string | null;
    status: string;
    createdAt: string;
    dealStatus: DealStatus;
    coin: string;
    network: string;
}
/** The middleman's work queue: assigned deals, waiting-on-you first. */
export declare function getMiddlemanQueue(userId: string): Promise<{
    items: QueueItem[];
    summary: QueueSummary;
}>;
/** Open / under-review disputes the middleman needs to triage. */
export declare function getOpenDisputes(userId: string): Promise<{
    disputes: AdminDispute[];
}>;
//# sourceMappingURL=admin.service.d.ts.map