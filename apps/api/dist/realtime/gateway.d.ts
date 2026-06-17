import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { Redis } from 'ioredis';
import { type TokenVerifier, type DenylistCheck, type HandshakeIdentity } from '../modules/chat/handshake.js';
import { type DealParties } from '../modules/chat/chat-types.js';
import { type WindowState } from '../modules/chat/rate-limit.js';
/** Lookup of a chat's type + deal parties, used to authorize a join. */
export interface ChatAuthContext {
    dealId: string;
    chatType: 'buyer_seller' | 'buyer_mm' | 'seller_mm' | 'handover_mm';
    parties: DealParties;
}
export interface GatewayDeps {
    pubClient: Redis;
    subClient: Redis;
    verifyToken: TokenVerifier;
    isJtiDenied: DenylistCheck;
    loadChatAuth: (chatId: string) => Promise<ChatAuthContext | null>;
    loadDealAuth: (dealId: string) => Promise<{
        buyerId: string;
        sellerId: string;
        middlemanId: string | null;
    } | null>;
    /** Per-event rate limit window persistence (Redis-backed in production). */
    rateState: (socketId: string, event: string) => Promise<WindowState | null>;
    saveRateState: (socketId: string, event: string, state: WindowState) => Promise<void>;
    now?: () => number;
}
/** Build and configure the Socket.IO server with auth, adapter, and handlers. */
export declare function createGateway(httpServer: HttpServer, deps: GatewayDeps): Server;
/** Helper exposed for tests: the deal role of a connected user. */
export declare function connectedUserRole(identity: HandshakeIdentity, parties: DealParties): import("../modules/chat/chat-types.js").DealRole | null;
//# sourceMappingURL=gateway.d.ts.map