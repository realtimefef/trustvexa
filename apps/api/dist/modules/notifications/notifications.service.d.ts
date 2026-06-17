import type { NotificationChannel } from './notification-prefs.js';
export interface NotificationView {
    id: string;
    dealId: string | null;
    type: string;
    payload: Record<string, unknown>;
    priority: 'normal' | 'important';
    pinned: boolean;
    read: boolean;
    readAt: string | null;
    archived: boolean;
    archivedAt: string | null;
    createdAt: string;
}
export interface ListNotificationsResult {
    items: NotificationView[];
    nextCursor: string | null;
}
export interface ListNotificationsParams {
    limit?: number;
    cursor?: string;
    includeArchived?: boolean;
}
/** List the caller's notifications, newest first, with keyset pagination. */
export declare function listForUser(userId: string, params: ListNotificationsParams): Promise<ListNotificationsResult>;
export interface MarkReadResult {
    id: string;
    read: boolean;
}
/**
 * Mark a single notification read. Idempotent: a missing or already-read
 * notification owned by the caller still resolves successfully. A notification
 * owned by someone else is reported as not found so ownership is not leaked.
 */
export declare function markOneRead(userId: string, notificationId: string): Promise<MarkReadResult>;
export interface MarkAllReadResult {
    updated: number;
}
/** Mark every unread notification for the caller read. Idempotent. */
export declare function markAllRead(userId: string): Promise<MarkAllReadResult>;
export interface PreferenceView {
    eventType: string;
    channel: NotificationChannel;
    enabled: boolean;
}
/** List the caller's per-event channel preferences. */
export declare function getPreferences(userId: string): Promise<PreferenceView[]>;
export interface UpsertPreferenceInput {
    eventType: string;
    channel: NotificationChannel;
    enabled: boolean;
}
/**
 * Upsert a single (event_type, channel) preference for the caller. Idempotent
 * via the UNIQUE(user_id, event_type, channel) constraint — repeated calls
 * converge on the same row and just refresh `enabled`.
 */
export declare function upsertPreference(userId: string, input: UpsertPreferenceInput): Promise<PreferenceView>;
export interface PushSubscribeInput {
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    device?: string | null;
}
export interface PushSubscriptionView {
    id: string;
    endpoint: string;
}
/**
 * Register (or refresh) a web-push subscription for the caller. The
 * push_subscriptions table has no unique constraint on endpoint, so idempotency
 * is enforced manually: an existing active subscription for the same
 * (user_id, endpoint) is updated in place; otherwise a new row is inserted.
 */
export declare function subscribePush(userId: string, input: PushSubscribeInput): Promise<PushSubscriptionView>;
//# sourceMappingURL=notifications.service.d.ts.map