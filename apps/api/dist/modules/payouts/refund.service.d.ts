import { type RefundCause } from '../money/payout-queue.js';
export interface ProcessRefundInput {
    middlemanId: string;
    dealId: string;
    idempotencyKey: string;
    cause: RefundCause;
    reason: string;
    gasCostSmallestUnit?: string;
}
export interface ProcessRefundResult {
    dealId: string;
    status: string;
    cause: RefundCause;
    refundedAmountSmallestUnit: string;
    refundEventId: string | null;
    alreadyProcessed: boolean;
}
export declare function processRefundForDeal(input: ProcessRefundInput): Promise<ProcessRefundResult>;
//# sourceMappingURL=refund.service.d.ts.map