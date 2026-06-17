/**
 * Zod schemas for the notifications REST router (slot 5 validation). Shared
 * shapes for listing, marking read, preferences upsert, and push subscribe.
 * Channels mirror the `notification_channel` enum (`email` | `in_app`).
 */
import { z } from 'zod';
/** Cursor/limit pagination for the notifications list (newest first). */
export declare const listNotificationsQuerySchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
    archived: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    cursor?: string | undefined;
    archived?: "true" | "false" | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
    archived?: "true" | "false" | undefined;
}>;
/** `:id` path param for single-notification routes. */
export declare const notificationIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/** Upsert a per-event channel preference (idempotent on user+event+channel). */
export declare const upsertPreferenceSchema: z.ZodObject<{
    event_type: z.ZodString;
    channel: z.ZodEnum<["email", "in_app"]>;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    channel: "email" | "in_app";
    enabled: boolean;
    event_type: string;
}, {
    channel: "email" | "in_app";
    enabled: boolean;
    event_type: string;
}>;
/** Register/refresh a web-push subscription (idempotent on user+endpoint). */
export declare const pushSubscribeSchema: z.ZodObject<{
    endpoint: z.ZodString;
    p256dh_key: z.ZodString;
    auth_key: z.ZodString;
    device: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
    device?: string | null | undefined;
}, {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
    device?: string | null | undefined;
}>;
//# sourceMappingURL=notifications.schemas.d.ts.map