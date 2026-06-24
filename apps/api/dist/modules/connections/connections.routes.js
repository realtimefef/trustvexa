/**
 * Connections feature router, mounted at `/api/v1/connections`.
 *
 *   POST /connections              — create a connection (returns join code)
 *   POST /connections/join         — join a connection by code
 *   GET  /connections              — list the caller's connections
 *   GET  /connections/:id          — get one connection (participants only)
 *   GET  /connections/:id/messages — list messages
 *   POST /connections/:id/messages — post a message
 *
 * All routes require a signed-in account; participant access is enforced in the
 * service.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './connections.controller.js';
const idParamSchema = z.object({ id: z.string().uuid() });
const msgParamSchema = z.object({ id: z.string().uuid(), msgId: z.string().uuid() });
const joinSchema = z.object({ code: z.string().trim().min(4).max(16) });
const createSchema = z.object({ role: z.enum(['buyer', 'seller']).optional() });
const messageSchema = z.object({
    body: z.string().trim().min(1).max(4000),
    channel: z.enum(['buyer_seller', 'buyer_mm', 'seller_mm']).optional(),
});
const messagesQuerySchema = z.object({
    channel: z.enum(['buyer_seller', 'buyer_mm', 'seller_mm']).optional(),
});
export function connectionsRouter() {
    const router = Router();
    router.post('/', ...apiChain({ schemas: { body: createSchema }, roles: ['user', 'middleman'], rateLimit: { windowSeconds: 3600, max: 100 } }), asyncHandler(controller.createConnection));
    router.post('/join', ...apiChain({
        schemas: { body: joinSchema },
        roles: ['user', 'middleman'],
        rateLimit: { windowSeconds: 600, max: 30 },
    }), asyncHandler(controller.joinConnection));
    // POST /connections/contact-middleman — one-click chat with a middleman
    // (no code needed; an available middleman is auto-assigned).
    router.post('/contact-middleman', ...apiChain({ roles: ['user'], rateLimit: { windowSeconds: 3600, max: 10 } }), asyncHandler(controller.contactMiddleman));
    router.get('/', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.listConnections));
    router.get('/:id', ...apiChain({ schemas: { params: idParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getConnection));
    router.get('/:id/messages', ...apiChain({
        schemas: { params: idParamSchema, query: messagesQuerySchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.listMessages));
    router.post('/:id/messages', ...apiChain({
        schemas: { params: idParamSchema, body: messageSchema },
        roles: ['user', 'middleman'],
        rateLimit: { windowSeconds: 60, max: 30 },
    }), asyncHandler(controller.postMessage));
    // DELETE /connections/:id — close/archive a connection.
    router.delete('/:id', ...apiChain({ schemas: { params: idParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.closeConnection));
    // POST /connections/:id/invite-middleman — bring an available middleman into an
    // existing buyer↔seller chat. Idempotent: returns current state if already present.
    router.post('/:id/invite-middleman', ...apiChain({
        schemas: { params: idParamSchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
        rateLimit: { windowSeconds: 3600, max: 5 },
    }), asyncHandler(controller.inviteMiddleman));
    // DELETE /connections/:id/messages/:msgId — soft-delete a single message (sender only).
    router.delete('/:id/messages/:msgId', ...apiChain({
        schemas: { params: msgParamSchema },
        roles: ['user', 'middleman'],
    }), asyncHandler(controller.deleteMessage));
    return router;
}
//# sourceMappingURL=connections.routes.js.map