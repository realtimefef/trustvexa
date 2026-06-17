/**
 * Chat feature router (REST), intended to mount at `/api/v1/chats`. Realtime
 * messaging is served separately by the Socket.IO gateway; these endpoints back
 * history/list reads plus the message write + utility surface.
 *
 *   GET    /chats                          — chats the caller participates in
 *   GET    /chats/:id/messages             — messages in a chat the caller may access
 *   GET    /chats/:id/messages/search?q=   — in-chat text search (caller's visible messages)
 *   POST   /chats/:id/messages             — post a message (idempotent)
 *   PATCH  /chats/:id/messages/:messageId  — edit own message (retains edit history)
 *   DELETE /chats/:id/messages/:messageId  — soft-delete own message
 *   GET    /chats/:id/drafts               — read the caller's draft
 *   PUT    /chats/:id/drafts               — autosave the caller's draft
 *   POST   /chats/:id/receipts             — mark message(s) delivered/read
 *
 * All are restricted to signed-in accounts. Per-chat access (and the opaque
 * 404 for chats the caller may not read) is enforced in the service using the
 * existing membership/visibility helpers.
 */
import { Router } from 'express';
export declare function chatRouter(): Router;
//# sourceMappingURL=chat.routes.d.ts.map