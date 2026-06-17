import type { CreateWebhookInput } from './webhook.schemas.js';
export interface Webhook {
    id: string;
    userId: string;
    url: string;
    secret: string;
    events: string[];
    active: boolean;
    createdAt: string;
}
export declare function createWebhook(userId: string, input: CreateWebhookInput): Promise<Webhook>;
export declare function listWebhooks(userId: string): Promise<{
    webhooks: Webhook[];
}>;
export declare function deleteWebhook(userId: string, id: string): Promise<void>;
/** Dispatches a webhook event payload asynchronously to all matching webhooks subscribing to it. */
export declare function triggerWebhook(userId: string, eventType: 'deal.funded' | 'deal.completed' | 'deal.disputed' | 'payout.broadcast', payload: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=webhook.service.d.ts.map