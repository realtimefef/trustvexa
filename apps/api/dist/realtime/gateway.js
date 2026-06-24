// Socket.IO realtime gateway (task 6.1).
// Wires the JWT handshake, the Redis adapter for multi-instance fan-out, and
// server-side room-join authorization. All trust decisions delegate to the
// pure helpers in the chat module so they are unit-testable; this file is the
// thin I/O shell. It is intentionally dependency-injected (verifier, denylist,
// deal lookup) so it can be exercised by the realtime integration tests.
// (Requirements 30.1, 30.2, 30.3, 30.4, 30.5, 30.7, 3.2)
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { authenticateHandshake, } from '../modules/chat/handshake.js';
import { canJoinChatRoom, roleOf } from '../modules/chat/membership.js';
import { chatRoom, userRoom, dealRoom, CLIENT_EVENTS, SERVER_EVENTS, } from '../modules/chat/chat-types.js';
import { checkRateLimit } from '../modules/chat/rate-limit.js';
const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_WINDOW_MS = 10_000;
function extractToken(socket) {
    const auth = socket.handshake.auth;
    if (auth && typeof auth.token === 'string')
        return auth.token;
    const header = socket.handshake.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
        return header.slice('Bearer '.length);
    }
    return null;
}
/** Build and configure the Socket.IO server with auth, adapter, and handlers. */
export function createGateway(httpServer, deps) {
    const now = deps.now ?? (() => Date.now());
    const allowedOrigins = deps.corsOrigins ?? [];
    const io = new Server(httpServer, {
        transports: ['websocket', 'polling'],
        // Allow the configured web origins to connect cross-origin. Sockets use
        // bearer-token auth in the handshake (not cookies), so we don't need
        // credentialed CORS; when no origins are configured we reflect any origin
        // (the JWT handshake is still the real gate).
        cors: {
            origin: allowedOrigins.length > 0 ? allowedOrigins : true,
            methods: ['GET', 'POST'],
            credentials: false,
        },
    });
    io.adapter(createAdapter(deps.pubClient, deps.subClient));
    // Handshake authentication middleware (runs on connect AND reconnect).
    io.use(async (socket, next) => {
        const result = await authenticateHandshake(extractToken(socket), deps.verifyToken, deps.isJtiDenied, Math.floor(now() / 1000));
        if (!result.ok) {
            next(new Error(`handshake_failed:${result.reason}`));
            return;
        }
        socket.data.identity = result.identity;
        // Every socket joins its own user room for targeted fan-out.
        await socket.join(userRoom(result.identity.userId));
        next();
    });
    io.on('connection', (socket) => {
        const session = socket.data;
        socket.on('deal:join', async (payload, ack) => {
            if (!payload || typeof payload !== 'object' || !('dealId' in payload)) {
                ack?.(false);
                return;
            }
            const { dealId } = payload;
            if (typeof dealId !== 'string' || !dealId) {
                ack?.(false);
                return;
            }
            const ctx = await deps.loadDealAuth(dealId);
            if (!ctx) {
                ack?.(false);
                return;
            }
            const userId = session.identity.userId;
            const isParty = ctx.buyerId === userId || ctx.sellerId === userId || ctx.middlemanId === userId;
            if (!isParty) {
                ack?.(false);
                return;
            }
            await socket.join(dealRoom(dealId));
            ack?.(true);
        });
        socket.on('deal:leave', async (payload, ack) => {
            if (!payload || typeof payload !== 'object' || !('dealId' in payload)) {
                ack?.(false);
                return;
            }
            const { dealId } = payload;
            if (typeof dealId !== 'string' || !dealId) {
                ack?.(false);
                return;
            }
            await socket.leave(dealRoom(dealId));
            ack?.(true);
        });
        socket.on(CLIENT_EVENTS.joinChat, async (chatId, ack) => {
            const ctx = await deps.loadChatAuth(chatId);
            if (!ctx) {
                ack?.(false);
                return;
            }
            const userId = session.identity.userId;
            if (!canJoinChatRoom(userId, ctx.chatType, ctx.parties)) {
                ack?.(false);
                return;
            }
            await socket.join(chatRoom(chatId));
            await socket.join(dealRoom(ctx.dealId));
            ack?.(true);
        });
        socket.on(CLIENT_EVENTS.sendMessage, async (chatId, payload, ack) => {
            // Server-side room membership re-check: never trust the client's room list.
            if (!socket.rooms.has(chatRoom(chatId))) {
                ack?.(false);
                return;
            }
            const prior = await deps.rateState(socket.id, CLIENT_EVENTS.sendMessage);
            const decision = checkRateLimit(prior, now(), MESSAGE_RATE_LIMIT, MESSAGE_RATE_WINDOW_MS);
            await deps.saveRateState(socket.id, CLIENT_EVENTS.sendMessage, decision.next);
            if (!decision.allowed) {
                ack?.(false);
                return;
            }
            // Persistence is wired by the chat service; here we fan the accepted
            // message out to the other participants in the chat room so it appears
            // live. Message CONTENT is delivered to all parties (including the
            // middleman) — only presence/typing/read state is privacy-restricted.
            const body = payload && typeof payload === 'object' && 'body' in payload
                ? (payload.body ?? null)
                : null;
            socket.to(chatRoom(chatId)).emit(SERVER_EVENTS.messageNew, {
                chatId,
                senderId: session.identity.userId,
                body: typeof body === 'string' ? body : null,
                at: now(),
            });
            // Also emit to individual user rooms for background pages (e.g. messages list)
            const chatAuth = await deps.loadChatAuth(chatId);
            if (chatAuth) {
                const opponentIds = [chatAuth.parties.buyerId, chatAuth.parties.sellerId, chatAuth.parties.middlemanId]
                    .filter((id) => typeof id === 'string' && id !== session.identity.userId);
                for (const oppId of opponentIds) {
                    socket.to(userRoom(oppId)).emit(SERVER_EVENTS.messageNew, {
                        chatId,
                        senderId: session.identity.userId,
                        body: typeof body === 'string' ? body : null,
                        at: now(),
                    });
                }
            }
            ack?.(true);
        });
        // Typing indicators. The middleman's typing is NEVER emitted to a buyer or
        // seller (presence-privacy invariant), so when the typist is the
        // middleman we suppress the broadcast entirely. A buyer/seller's typing is
        // fanned to the rest of the chat room.
        const emitTyping = async (chatId, typing) => {
            if (!socket.rooms.has(chatRoom(chatId)))
                return;
            const ctx = await deps.loadChatAuth(chatId);
            if (!ctx)
                return;
            if (roleOf(session.identity.userId, ctx.parties) === 'middleman')
                return;
            socket.to(chatRoom(chatId)).emit(SERVER_EVENTS.typing, {
                chatId,
                userId: session.identity.userId,
                typing,
            });
        };
        socket.on(CLIENT_EVENTS.startTyping, (chatId) => {
            void emitTyping(chatId, true);
        });
        socket.on(CLIENT_EVENTS.stopTyping, (chatId) => {
            void emitTyping(chatId, false);
        });
        // Read receipts follow the same privacy rule: the middleman's read state is
        // never surfaced to a buyer or seller.
        socket.on(CLIENT_EVENTS.markRead, async (chatId, messageId) => {
            if (!socket.rooms.has(chatRoom(chatId)))
                return;
            const ctx = await deps.loadChatAuth(chatId);
            if (!ctx)
                return;
            if (roleOf(session.identity.userId, ctx.parties) === 'middleman')
                return;
            socket.to(chatRoom(chatId)).emit(SERVER_EVENTS.readAck, {
                chatId,
                messageId,
                userId: session.identity.userId,
                at: now(),
            });
        });
    });
    return io;
}
/** Helper exposed for tests: the deal role of a connected user. */
export function connectedUserRole(identity, parties) {
    return roleOf(identity.userId, parties);
}
//# sourceMappingURL=gateway.js.map