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
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { MAX_MESSAGE_CHARS } from './messaging.js';
import * as controller from './chat.controller.js';
const chatIdParamSchema = z.object({ id: z.string().uuid() });
const messageIdParamSchema = z.object({ id: z.string().uuid(), messageId: z.string().uuid() });
const messagesQuerySchema = z.object({
    order: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    before: z.string().datetime().optional(),
});
const attachmentRefSchema = z.object({
    kind: z.enum(['image', 'video', 'voice', 'document']),
    file_key: z.string().trim().min(1),
    mime_type: z.string().trim().min(1),
    size_bytes: z.number().int().positive(),
    duration_seconds: z.number().int().positive().nullish(),
});
const postMessageSchema = z.object({
    body: z.string().max(MAX_MESSAGE_CHARS).nullish(),
    attachments: z.array(attachmentRefSchema).max(10).optional(),
    reply_to: z.string().uuid().nullish(),
    forwarded_from: z.string().uuid().nullish(),
});
const editMessageSchema = z.object({ body: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) });
const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(200) });
const saveDraftSchema = z.object({ body: z.string().max(MAX_MESSAGE_CHARS).nullish() });
const receiptsSchema = z.object({
    message_ids: z.array(z.string().uuid()).min(1).max(500),
    kind: z.enum(['delivered', 'read']),
});
const reactionParamSchema = z.object({
    id: z.string().uuid(),
    messageId: z.string().uuid(),
});
const reactionBodySchema = z.object({
    emoji: z.string().trim().min(1).max(32),
});
const forwardBodySchema = z.object({
    sourceChatId: z.string().uuid(),
});
export function chatRouter() {
    const router = Router();
    router.get('/', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.listChats));
    router.get('/:id/messages', ...apiChain({
        schemas: { params: chatIdParamSchema, query: messagesQuerySchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.listMessages));
    // In-chat text search over the caller's visible messages. Registered before
    // the `:messageId` routes so `search` is never captured as a message id.
    router.get('/:id/messages/search', ...apiChain({
        schemas: { params: chatIdParamSchema, query: searchQuerySchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.searchMessages));
    // Post a message (body and/or attachment refs). Idempotent write.
    router.post('/:id/messages', ...apiChain({
        schemas: { params: chatIdParamSchema, body: postMessageSchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
        rateLimit: { windowSeconds: 60, max: 120 },
    }), asyncHandler(controller.postMessage));
    // Edit own message (keeps middleman-visible edit history).
    router.patch('/:id/messages/:messageId', ...apiChain({
        schemas: { params: messageIdParamSchema, body: editMessageSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.editMessage));
    // Soft-delete own message (hidden from users, retained for the middleman).
    router.delete('/:id/messages/:messageId', ...apiChain({
        schemas: { params: messageIdParamSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.deleteMessage));
    // Per-(chat,user) draft autosave.
    router.get('/:id/drafts', ...apiChain({ schemas: { params: chatIdParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getDraft));
    router.put('/:id/drafts', ...apiChain({
        schemas: { params: chatIdParamSchema, body: saveDraftSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.saveDraft));
    // Mark message(s) delivered/read for the caller.
    router.post('/:id/receipts', ...apiChain({
        schemas: { params: chatIdParamSchema, body: receiptsSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.markReceipts));
    // Update conversation settings (mute / archive)
    router.put('/:id/settings', ...apiChain({
        schemas: {
            params: chatIdParamSchema,
            body: z.object({
                isMuted: z.boolean().optional(),
                isArchived: z.boolean().optional(),
            }),
        },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.updateSettings));
    // Reactions
    router.post('/:id/react/:messageId', ...apiChain({
        schemas: { params: reactionParamSchema, body: reactionBodySchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
        rateLimit: { windowSeconds: 60, max: 120 },
    }), asyncHandler(controller.addReaction));
    router.delete('/:id/react/:messageId', ...apiChain({
        schemas: { params: reactionParamSchema, body: reactionBodySchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.removeReaction));
    // Pins
    router.get('/:id/pins', ...apiChain({
        schemas: { params: chatIdParamSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.listPinnedMessages));
    router.post('/:id/pin/:messageId', ...apiChain({
        schemas: { params: reactionParamSchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.pinMessage));
    router.delete('/:id/pin/:messageId', ...apiChain({
        schemas: { params: reactionParamSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.unpinMessage));
    // Forwards
    router.post('/:id/forward/:messageId', ...apiChain({
        schemas: { params: reactionParamSchema, body: forwardBodySchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.forwardMessage));
    return router;
}
//# sourceMappingURL=chat.routes.js.map