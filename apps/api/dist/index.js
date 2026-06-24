import { API_PREFIX, getRedis, query } from '@trustvexa/shared';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './logger.js';
import { createGateway } from './realtime/gateway.js';
import { getAuthConfig } from './modules/auth/auth.config.js';
import { verifyAccessToken } from './modules/auth/jwt.js';
import { isJtiRevoked } from './modules/auth/token-store.js';
import { getChatWithParties } from './modules/chat/chat-read.repository.js';
import { assertRuntimeConfig } from './modules/launch/config-validation.js';
/**
 * API service entrypoint. Builds the Express app (with the fixed middleware
 * stack) and starts listening. Routes mount under the `/api/v1` prefix.
 * (Requirements 44.1, 44.3)
 */
export function main() {
    assertRuntimeConfig();
    const app = createApp();
    const server = app.listen(config.port, () => {
        logger.info({ port: config.port, prefix: API_PREFIX, env: config.nodeEnv }, 'TrustVexa API listening');
    });
    try {
        const redis = getRedis();
        const pubClient = redis.duplicate();
        const subClient = redis.duplicate();
        pubClient.on('error', (err) => logger.error({ err }, 'Realtime pub client error'));
        subClient.on('error', (err) => logger.error({ err }, 'Realtime sub client error'));
        const io = createGateway(server, {
            pubClient,
            subClient,
            corsOrigins: config.corsOrigins,
            verifyToken: (token) => {
                try {
                    const cfg = getAuthConfig();
                    const claims = verifyAccessToken(token, cfg);
                    return {
                        userId: claims.sub,
                        role: claims.role,
                        sessionId: claims.sid,
                        jti: claims.jti,
                        exp: claims.exp,
                    };
                }
                catch {
                    return null;
                }
            },
            isJtiDenied: async (jti) => {
                return isJtiRevoked(jti);
            },
            loadChatAuth: async (chatId) => {
                const chat = await getChatWithParties(chatId);
                if (!chat)
                    return null;
                return {
                    dealId: chat.deal_id,
                    chatType: chat.type,
                    parties: {
                        buyerId: chat.buyer_id,
                        sellerId: chat.seller_id,
                        middlemanId: chat.middleman_id,
                    },
                };
            },
            loadDealAuth: async (dealId) => {
                const { rows } = await query(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1`, [dealId]);
                const deal = rows[0];
                if (!deal)
                    return null;
                return {
                    buyerId: deal.buyer_id,
                    sellerId: deal.seller_id,
                    middlemanId: deal.middleman_id,
                };
            },
            rateState: async (socketId, event) => {
                const data = await redis.get(`rate:socket:${socketId}:${event}`);
                if (!data)
                    return null;
                return JSON.parse(data);
            },
            saveRateState: async (socketId, event, state) => {
                await redis.set(`rate:socket:${socketId}:${event}`, JSON.stringify(state), 'EX', 60);
            },
        });
        const realtimeSub = redis.duplicate();
        realtimeSub.on('error', (err) => logger.error({ err }, 'Realtime custom sub client error'));
        realtimeSub.subscribe('realtime:deal:events', 'realtime:wallet:events').catch((err) => {
            logger.error({ err }, 'Failed to subscribe to realtime Redis channels');
        });
        // Pattern subscribe for per-user connection-message events.
        // Published as: realtime:connection:{userId}
        realtimeSub.psubscribe('realtime:connection:*').catch((err) => {
            logger.error({ err }, 'Failed to psubscribe to connection message channels');
        });
        realtimeSub.on('message', (channel, message) => {
            try {
                const data = JSON.parse(message);
                if (channel === 'realtime:deal:events') {
                    const { dealId, event, payload } = data;
                    if (dealId && event) {
                        io.to(`deal:${dealId}`).emit(event, payload);
                    }
                }
                else if (channel === 'realtime:wallet:events') {
                    const { userId, event, payload } = data;
                    if (userId && event) {
                        io.to(`user:${userId}`).emit(event, payload);
                    }
                }
            }
            catch (err) {
                logger.error({ err, channel, message }, 'Failed to process redis pub/sub message');
            }
        });
        // Pattern message handler: forward connection-chat messages to the
        // recipient's personal socket room so the connect page gets live updates.
        realtimeSub.on('pmessage', (_pattern, channel, message) => {
            try {
                // channel = "realtime:connection:{userId}"
                const userId = channel.replace('realtime:connection:', '');
                if (!userId)
                    return;
                const data = JSON.parse(message);
                // Emit to that user's personal socket room — the client listens for
                // "connection:message:new" on the global socket connection.
                io.to(`user:${userId}`).emit('connection:message:new', data);
            }
            catch (err) {
                logger.error({ err, channel, message }, 'Failed to process connection message pub/sub');
            }
        });
        logger.info('Realtime Socket.IO gateway attached to server.');
    }
    catch (err) {
        logger.error({ err }, 'Failed to initialize realtime Socket.IO gateway');
    }
    // Graceful shutdown so `tsx watch` reloads (and container stops) release the
    // listening socket before the next instance binds. Without this the reload
    // races the old listener and crashes with EADDRINUSE on port reuse.
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        logger.info({ signal }, 'Shutting down API server…');
        server.close(() => {
            process.exit(0);
        });
        // Safety net: force-exit if close hangs on lingering keep-alive sockets.
        setTimeout(() => process.exit(0), 3000).unref();
    };
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGUSR2']) {
        process.once(signal, () => shutdown(signal));
    }
}
main();
//# sourceMappingURL=index.js.map