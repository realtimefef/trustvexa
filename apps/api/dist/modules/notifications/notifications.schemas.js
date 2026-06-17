/**
 * Zod schemas for the notifications REST router (slot 5 validation). Shared
 * shapes for listing, marking read, preferences upsert, and push subscribe.
 * Channels mirror the `notification_channel` enum (`email` | `in_app`).
 */
import { z } from 'zod';
/** Cursor/limit pagination for the notifications list (newest first). */
export const listNotificationsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().min(1).max(512).optional(),
    archived: z.enum(['true', 'false']).optional(),
});
/** `:id` path param for single-notification routes. */
export const notificationIdParamSchema = z.object({ id: z.string().uuid() });
/** Upsert a per-event channel preference (idempotent on user+event+channel). */
export const upsertPreferenceSchema = z.object({
    event_type: z.string().trim().min(1).max(100),
    channel: z.enum(['email', 'in_app']),
    enabled: z.boolean(),
});
/** Register/refresh a web-push subscription (idempotent on user+endpoint). */
export const pushSubscribeSchema = z.object({
    endpoint: z.string().trim().url().max(2048),
    p256dh_key: z.string().trim().min(1).max(512),
    auth_key: z.string().trim().min(1).max(512),
    device: z.string().trim().max(256).nullish(),
});
//# sourceMappingURL=notifications.schemas.js.map