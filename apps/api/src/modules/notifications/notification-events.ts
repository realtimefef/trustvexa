// Realtime notification event catalogue + publish payload builders (task 6.9).
// Services publish these through Redis; the gateway fans them out to the
// affected user/deal rooms. Pure payload construction keeps the contract
// testable and consistent across services.
// (Requirements 36.4, 36.8, 30.6)

import type { NotificationPriority } from './notification-prefs.js';

export const NOTIFICATION_EVENT_TYPES = [
  'deal:update',
  'payment:received',
  'confirmation:update',
  'payout:update',
  'refund:update',
  'dispute:update',
  'chat:message',
  'sla:warning',
] as const;

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
export function buildPublishEnvelope(args: {
  eventType: NotificationEventType;
  dealId: string | null;
  recipientUserIds: readonly string[];
  priority?: NotificationPriority;
  payload?: Record<string, unknown>;
  nowIso: string;
}): RealtimePublishEnvelope {
  return {
    eventType: args.eventType,
    dealId: args.dealId,
    recipientUserIds: [...new Set(args.recipientUserIds)],
    priority: args.priority ?? 'normal',
    payload: args.payload ?? {},
    emittedAt: args.nowIso,
  };
}

/** Money/dispute events are important; chat and generic updates are normal. */
export function defaultPriorityFor(eventType: NotificationEventType): NotificationPriority {
  switch (eventType) {
    case 'payout:update':
    case 'refund:update':
    case 'dispute:update':
    case 'payment:received':
      return 'important';
    default:
      return 'normal';
  }
}
