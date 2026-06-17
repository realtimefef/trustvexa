/**
 * Read-side data access for the notifications REST surface. Reads run against
 * the shared pool with `query` (mirrors reviews-read.repository). Every read is
 * scoped to the owning user id derived from the verified JWT — a user can only
 * see their own notifications and preferences. (Requirements 36.1, 36.2, 36.5)
 */
import { query } from '@trustvexa/shared';

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
export async function listNotifications(
  userId: string,
  opts: ListNotificationsOptions,
): Promise<NotificationListRow[]> {
  const params: unknown[] = [userId];
  const conditions: string[] = ['user_id = $1'];

  if (!opts.includeArchived) {
    conditions.push('archived_at IS NULL');
  }

  if (opts.cursorCreatedAt !== undefined && opts.cursorId !== undefined) {
    params.push(opts.cursorCreatedAt, opts.cursorId);
    conditions.push(`(created_at, id) < ($${params.length - 1}, $${params.length})`);
  }

  params.push(opts.limit);
  const limitPlaceholder = `$${params.length}`;

  const res = await query<NotificationListRow>(
    `SELECT id, deal_id, type, payload, priority, pinned, read_at, archived_at, created_at
       FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitPlaceholder}`,
    params,
  );
  return res.rows;
}

/** Resolve a notification's owner so single-notification writes can authorize. */
export async function findNotificationOwner(
  notificationId: string,
): Promise<{ user_id: string; read_at: Date | string | null } | null> {
  const res = await query<{ user_id: string; read_at: Date | string | null }>(
    `SELECT user_id, read_at FROM notifications WHERE id = $1 LIMIT 1`,
    [notificationId],
  );
  return res.rows[0] ?? null;
}

export interface PreferenceRow {
  id: string;
  event_type: string;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: Date | string;
}

/** List the caller's per-event channel preferences. */
export async function listPreferences(userId: string): Promise<PreferenceRow[]> {
  const res = await query<PreferenceRow>(
    `SELECT id, event_type, channel, enabled, created_at
       FROM notification_preferences
      WHERE user_id = $1
      ORDER BY event_type ASC, channel ASC`,
    [userId],
  );
  return res.rows;
}
