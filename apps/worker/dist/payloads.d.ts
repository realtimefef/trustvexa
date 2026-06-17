/**
 * Background-job payload contracts + defensive parsers.
 *
 * BullMQ delivers `job.data` as untyped JSON, so each queue's payload is parsed
 * and validated here before a processor runs. The worker has no Zod dependency,
 * so these are small hand-written guards that throw
 * {@link InvalidJobPayloadError} (a non-retryable, dead-letter-worthy error) on
 * malformed input. bigint money amounts travel as decimal strings to preserve
 * precision across the JSON boundary.
 *
 * The literal unions below (notification event types, dead-letter statuses) are
 * intentionally local copies of the domain unions: they are structurally
 * identical, so values flow into the API domain functions without coupling the
 * worker's payload layer to the API's internal module graph.
 */
export declare class InvalidJobPayloadError extends Error {
    constructor(message: string);
}
export interface EmailJob {
    readonly to: string;
    readonly subject?: string;
    readonly html?: string;
    readonly text?: string;
    readonly templateName?: string;
    readonly templateData?: Record<string, unknown>;
}
export declare function parseEmailJob(data: unknown): EmailJob;
export type NotificationEventType = 'deal:update' | 'payment:received' | 'confirmation:update' | 'payout:update' | 'refund:update' | 'dispute:update' | 'chat:message' | 'sla:warning';
export interface NotificationFanoutJob {
    readonly eventType: NotificationEventType;
    readonly dealId: string | null;
    readonly recipientUserIds: string[];
    readonly payload: Record<string, unknown>;
}
export declare function parseNotificationFanoutJob(data: unknown): NotificationFanoutJob;
export type PayoutAction = 'broadcast' | 'confirm';
export interface PayoutProcessingJob {
    readonly payoutId: string;
    readonly expectedVersion: number;
    readonly action: PayoutAction;
    readonly coin: string;
    readonly network: string;
    readonly toAddress: string;
    readonly amountSmallestUnit: bigint;
    readonly txHash?: string;
}
export declare function parsePayoutProcessingJob(data: unknown): PayoutProcessingJob;
export interface MediaScanJob {
    readonly attachmentId: string;
    readonly storageKey: string;
    readonly sha256?: string;
}
export declare function parseMediaScanJob(data: unknown): MediaScanJob;
export interface FxRefreshJob {
    readonly coin: string;
    readonly fiat: string;
    readonly referenceRate?: number;
}
export declare function parseFxRefreshJob(data: unknown): FxRefreshJob;
export interface ReconciliationJob {
    readonly coin: string;
    readonly network: string;
    readonly ledgerBalance: bigint;
    readonly onchainBalance: bigint;
    readonly toleranceUnits?: bigint;
    readonly snapshot: {
        readonly heldInEscrow: bigint;
        readonly owedToSellers: bigint;
        readonly refundsOwed: bigint;
        readonly platformFeeRevenue: bigint;
        readonly gasSpent: bigint;
        readonly hotBalance: bigint;
        readonly coldBalance: bigint;
    };
}
export declare function parseReconciliationJob(data: unknown): ReconciliationJob;
export type DlqStatus = 'pending' | 'retrying' | 'failed' | 'resolved';
export interface DeadLetterControlJob {
    readonly deadLetterId: string;
    readonly fromStatus: DlqStatus;
    readonly toStatus: DlqStatus;
}
export declare function parseDeadLetterControlJob(data: unknown): DeadLetterControlJob;
export type DepositWatchNetwork = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export interface DepositWatchJob {
    readonly networks?: DepositWatchNetwork[];
}
export declare function parseDepositWatchJob(data: unknown): DepositWatchJob;
//# sourceMappingURL=payloads.d.ts.map