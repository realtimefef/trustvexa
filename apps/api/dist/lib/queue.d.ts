import { Queue } from 'bullmq';
export declare function getEmailQueue(): Queue;
export declare function getNotificationQueue(): Queue;
export declare function getPayoutQueue(): Queue;
export declare function getWebhookQueue(): Queue;
export declare function enqueueWebhookDelivery(args: {
    webhookId: string;
    url: string;
    secret: string;
    eventType: string;
    payload: Record<string, unknown>;
}): Promise<void>;
export declare function enqueueEmail(args: {
    to: string;
    templateName: 'welcome' | 'verify-email' | 'password-reset' | 'new-device-login' | 'deal-funded' | 'payout-sent' | 'sla-warning' | 'dispute-opened';
    templateData: Record<string, unknown>;
}): Promise<void>;
export declare function enqueueNotificationFanout(args: {
    eventType: string;
    dealId: string | null;
    recipientUserIds: string[];
    payload: Record<string, unknown>;
}): Promise<void>;
export declare function enqueuePayoutProcessing(args: {
    payoutId: string;
    expectedVersion: number;
    action: 'broadcast' | 'confirm';
    coin: string;
    network: string;
    toAddress: string;
    amountSmallestUnit: string;
}): Promise<void>;
//# sourceMappingURL=queue.d.ts.map