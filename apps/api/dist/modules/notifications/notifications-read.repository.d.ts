import type { NotificationChannel } from './notification-prefs.js';
export interface NotificationListRow {
    id: string;
    deal_id: string | null;
    type: string;
    payload: Record<string, unknown> | null;
    priority: 'normal' | 'important';
    pinned: boolean;
    read_at: Date | string | null;
    archived_at: Date | string | null;
    created_at: Date | string;
}
export interface ListNotificationsOptions {
    limit: number;
    /** Keyset cursor: only rows strictly older than (createdAt, id). */
    cursorCreatedAt?: string;
    cursorId?: string;
    includeArchived: boolean;
}
/**
 * List a user's notifications newest first using keyset pagination on
 * (created_at, id). Callers request `limit + 1` semantics by passing the page
 * size; this returns up to `limit` rows so the service can detect more pages.
 */
export declare function listNotifications(userId: string, opts: ListNotificationsOptions): Promise<NotificationListRow[]>;
/** Resolve a notification's owner so single-notification writes can authorize. */
export declare function findNotificationOwner(notificationId: string): Promise<{
    user_id: string;
    read_at: Date | string | null;
} | null>;
export interface PreferenceRow {
    id: string;
    event_type: string;
    channel: NotificationChannel;
    enabled: boolean;
    created_at: Date | string;
}
/** List the caller's per-event channel preferences. */
export declare function listPreferences(userId: string): Promise<PreferenceRow[]>;
//# sourceMappingURL=notifications-read.repository.d.ts.map