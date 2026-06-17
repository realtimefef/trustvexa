import type { DealRole } from '../chat/chat-types.js';
import type { DealStatus } from '../deal/state-machine.js';
import type { NextAction, TimelineEntry } from './action-center.js';
export interface DealSummary {
    id: string;
    role: DealRole;
    status: DealStatus;
    coin: string;
    network: string;
    networkMode: string;
    isPractice: boolean;
    dealAmountCents: string | null;
    amountCoin: string | null;
    feePayer: string | null;
    buyerTotalCents: string | null;
    sellerPayoutCents: string | null;
    holdStatus: string | null;
    riskScore: number | null;
    fundBy: string | null;
    completeBy: string | null;
    inspectionUntil: string | null;
    lastActivityAt: string | null;
    createdAt: string;
    updatedAt: string;
    nextActions: readonly NextAction[];
    waitingOnYou: boolean;
    tags?: string[];
}
export interface DealDetail extends DealSummary {
    amountSmallestUnit: string | null;
    lockedFxRate: string | null;
    fxSource: string | null;
    priceTolerancePct: string | null;
    platformFeeCents: string | null;
    sellerSettlementFeeCents: string | null;
    transactionFeeCents: string | null;
    legalHold: boolean;
    attemptNo: number;
    versionNo: number;
    timeline: TimelineEntry[];
    /** Party IDs — lets the UI skip the invite flow when a deal was created from a connection. */
    buyerId: string | null;
    sellerId: string | null;
}
/** Buyer/seller/middleman dashboard: every deal the user is a party to. */
export declare function getDashboard(userId: string): Promise<{
    deals: DealSummary[];
}>;
/** Deal-detail view: full snapshot + role-filtered activity timeline. */
export declare function getDealDetail(userId: string, dealId: string): Promise<DealDetail>;
//# sourceMappingURL=dashboard.service.d.ts.map