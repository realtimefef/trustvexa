export interface PushTxClient {
    query<R>(text: string, params?: unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface PushSubscriptionInput {
    userId: string;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    device?: string | null;
}
export interface PushSubscriptionRow {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
}
export declare function saveSubscription(client: PushTxClient, input: PushSubscriptionInput): Promise<PushSubscriptionRow>;
/** Revoke a subscription (e.g. on logout or 410 Gone from the push service). */
export declare function revokeSubscription(client: PushTxClient, endpoint: string): Promise<void>;
/** List a user's active (non-revoked) subscriptions for fan-out. */
export declare function activeSubscriptions(client: PushTxClient, userId: string): Promise<PushSubscriptionRow[]>;
//# sourceMappingURL=push.repository.d.ts.map