/**
 * Notifications REST service. Aggregates the read repositories and the existing
 * write repositories (notification.repository, push.repository) behind a small
 * use-case API the controller calls. Every operation is scoped to the user id
 * the controller derives from the verified JWT; a user id is never accepted
 * from request input. Writes that mutate state run inside a single transaction
 * via the shared `withTransaction` helper. (Requirements 36.1, 36.2, 36.4, 36.5)
 */
import { withTransaction } from '@trustvexa/shared';

import { notFound } from '../../errors/app-error.js';
import type { NotificationChannel } from './notification-prefs.js';
import { markRead } from './notification.repository.js';
import {
  findNotificationOwner,
  listNotifications,
  listPreferences,
  type ListNotificationsOptions,
  type NotificationListRow,
} from './notifications-read.repository.js';

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

/** Encode a keyset cursor as an opaque, URL-safe token. */
function encodeCursor(createdAt: Date | string, id: string): string {
  return Buffer.from(`${toIso(createdAt)}|${id}`, 'utf8').toString('base64url');
}

/** Decode a keyset cursor; returns null when the token is malformed. */
function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const sep = decoded.lastIndexOf('|');
    if (sep <= 0) return null;
    const createdAt = decoded.slice(0, sep);
    const id = decoded.slice(sep + 1);
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

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

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toView(row: NotificationListRow): NotificationView {
  return {
    id: row.id,
    dealId: row.deal_id,
    type: row.type,
    payload: row.payload ?? {},
    priority: row.priority,
    pinned: row.pinned,
    read: row.read_at !== null,
    readAt: toIsoOrNull(row.read_at),
    archived: row.archived_at !== null,
    archivedAt: toIsoOrNull(row.archived_at),
    createdAt: toIso(row.created_at),
  };
}

/** List the caller's notifications, newest first, with keyset pagination. */
export async function listForUser(
  userId: string,
  params: ListNotificationsParams,
): Promise<ListNotificationsResult> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const decoded = params.cursor ? decodeCursor(params.cursor) : null;

  // Fetch one extra row to know whether another page exists.
  const listOptions: ListNotificationsOptions = {
    limit: limit + 1,
    includeArchived: params.includeArchived ?? false,
  };
  if (decoded) {
    listOptions.cursorCreatedAt = decoded.createdAt;
    listOptions.cursorId = decoded.id;
  }
  const rows = await listNotifications(userId, listOptions);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(last.created_at, last.id) : null;

  return { items: page.map(toView), nextCursor };
}

export interface MarkReadResult {
  id: string;
  read: boolean;
}

/**
 * Mark a single notification read. Idempotent: a missing or already-read
 * notification owned by the caller still resolves successfully. A notification
 * owned by someone else is reported as not found so ownership is not leaked.
 */
export async function markOneRead(userId: string, notificationId: string): Promise<MarkReadResult> {
  const owner = await findNotificationOwner(notificationId);
  if (!owner || owner.user_id !== userId) {
    throw notFound('Notification not found.');
  }
  await withTransaction(async (client) => {
    await markRead(client, notificationId, userId);
  });
  return { id: notificationId, read: true };
}

export interface MarkAllReadResult {
  updated: number;
}

/** Mark every unread notification for the caller read. Idempotent. */
export async function markAllRead(userId: string): Promise<MarkAllReadResult> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return { updated: res.rowCount ?? 0 };
  });
}

export interface PreferenceView {
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
}

/** List the caller's per-event channel preferences. */
export async function getPreferences(userId: string): Promise<PreferenceView[]> {
  const rows = await listPreferences(userId);
  return rows.map((r) => ({ eventType: r.event_type, channel: r.channel, enabled: r.enabled }));
}

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
export async function upsertPreference(
  userId: string,
  input: UpsertPreferenceInput,
): Promise<PreferenceView> {
  return withTransaction(async (client) => {
    const res = await client.query<{
      event_type: string;
      channel: NotificationChannel;
      enabled: boolean;
    }>(
      `INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
            VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, event_type, channel)
       DO UPDATE SET enabled = EXCLUDED.enabled
         RETURNING event_type, channel, enabled`,
      [userId, input.eventType, input.channel, input.enabled],
    );
    const row = res.rows[0];
    if (!row) throw new Error('failed to upsert notification preference');
    return { eventType: row.event_type, channel: row.channel, enabled: row.enabled };
  });
}

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
export async function subscribePush(
  userId: string,
  input: PushSubscribeInput,
): Promise<PushSubscriptionView> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM push_subscriptions
        WHERE user_id = $1 AND endpoint = $2 AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1`,
      [userId, input.endpoint],
    );
    const current = existing.rows[0];
    if (current) {
      await client.query(
        `UPDATE push_subscriptions
            SET p256dh_key = $1, auth_key = $2, device = $3
          WHERE id = $4`,
        [input.p256dhKey, input.authKey, input.device ?? null, current.id],
      );
      return { id: current.id, endpoint: input.endpoint };
    }
    const inserted = await client.query<{ id: string; endpoint: string }>(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device)
            VALUES ($1, $2, $3, $4, $5)
         RETURNING id, endpoint`,
      [userId, input.endpoint, input.p256dhKey, input.authKey, input.device ?? null],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error('failed to save push subscription');
    return { id: row.id, endpoint: row.endpoint };
  });
}
