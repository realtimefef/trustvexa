import type { NotificationChannel, NotificationPriority } from './notification-prefs.js';
export interface NotificationTxClient {
    query<R>(text: string, params?: unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface InsertNotificationInput {
    userId: string;
    dealId: string | null;
    type: string;
    payload: Record<string, unknown>;
    priority: NotificationPriority;
    pinned?: boolean;
}
export interface NotificationRow {
    id: string;
    user_id: string;
    type: string;
    priority: NotificationPriority;
    read_at: string | null;
}
export declare function insertNotification(client: NotificationTxClient, input: InsertNotificationInput): Promise<NotificationRow>;
/** Mark a single notification read for its owner. */
export declare function markRead(client: NotificationTxClient, notificationId: string, userId: string): Promise<void>;
/**
 * Resolve whether a channel is enabled for a user + event type. Defaults to
 * enabled when no explicit preference row exists.
 */
export declare function isChannelEnabled(client: NotificationTxClient, userId: string, eventType: string, channel: NotificationChannel): Promise<boolean>;
//# sourceMappingURL=notification.repository.d.ts.map