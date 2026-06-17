// Notification persistence (task 6.9). Thin repository over notifications and
// notification_preferences. Injected transactional client; not barrel-exported;
// runs only against a real DB.
// (Requirements 36.1, 36.2, 36.5, 36.8)

import type { NotificationChannel, NotificationPriority } from './notification-prefs.js';

export interface NotificationTxClient {
  query<R>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
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

export async function insertNotification(
  client: NotificationTxClient,
  input: InsertNotificationInput,
): Promise<NotificationRow> {
  const res = await client.query<NotificationRow>(
    `INSERT INTO notifications (user_id, deal_id, type, payload, priority, pinned)
		 VALUES ($1, $2, $3, $4::jsonb, $5, $6)
		 RETURNING id, user_id, type, priority, read_at`,
    [
      input.userId,
      input.dealId,
      input.type,
      JSON.stringify(input.payload),
      input.priority,
      input.pinned ?? false,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('failed to insert notification');
  return row;
}

/** Mark a single notification read for its owner. */
export async function markRead(
  client: NotificationTxClient,
  notificationId: string,
  userId: string,
): Promise<void> {
  await client.query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId],
  );
}

/**
 * Resolve whether a channel is enabled for a user + event type. Defaults to
 * enabled when no explicit preference row exists.
 */
export async function isChannelEnabled(
  client: NotificationTxClient,
  userId: string,
  eventType: string,
  channel: NotificationChannel,
): Promise<boolean> {
  const res = await client.query<{ enabled: boolean }>(
    `SELECT enabled FROM notification_preferences
		  WHERE user_id = $1 AND event_type = $2 AND channel = $3
		  LIMIT 1`,
    [userId, eventType, channel],
  );
  const row = res.rows[0];
  return row ? row.enabled : true;
}
