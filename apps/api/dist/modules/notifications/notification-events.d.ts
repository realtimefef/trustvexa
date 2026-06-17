import type { NotificationPriority } from './notification-prefs.js';
export declare const NOTIFICATION_EVENT_TYPES: readonly ["deal:update", "payment:received", "confirmation:update", "payout:update", "refund:update", "dispute:update", "chat:message", "sla:warning"];
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];
export interface RealtimePublishEnvelope {
    eventType: NotificationEventType;
    dealId: string | null;
    /** Target user ids whose rooms should receive the fan-out. */
    recipientUserIds: readonly string[];
    priority: NotificationPriority;
    payload: Record<string, unknown>;
    emittedAt: string;
}
/** Build a normalized envelope for Redis publish + room fan-out. */
export declare function buildPublishEnvelope(args: {
    eventType: NotificationEventType;
    dealId: string | null;
    recipientUserIds: readonly string[];
    priority?: NotificationPriority;
    payload?: Record<string, unknown>;
    nowIso: string;
}): RealtimePublishEnvelope;
/** Money/dispute events are important; chat and generic updates are normal. */
export declare function defaultPriorityFor(eventType: NotificationEventType): NotificationPriority;
//# sourceMappingURL=notification-events.d.ts.map