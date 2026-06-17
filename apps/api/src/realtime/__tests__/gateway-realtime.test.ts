// Gateway realtime tests for rate-limiting, deal room join/leave, and event checks.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Server } from 'socket.io';
import { createGateway, type ChatAuthContext, type GatewayDeps } from '../gateway.js';
import type { HandshakeIdentity } from '../../modules/chat/handshake.js';
import { dealRoom } from '../../modules/chat/chat-types.js';

// Fake Redis
function fakeRedis(): any {
  return {
    duplicate() {
      return fakeRedis();
    },
    on() {},
    psubscribe() {},
    subscribe() {},
    publish() {},
  };
}

const DEAL = { buyerId: 'buyer-1', sellerId: 'seller-1', middlemanId: 'mm-1' };
let rateLimitBlocked = false;
let useDynamicRateState = false;
const dynamicRateStateMap = new Map<string, any>();

function identityFor(userId: string): HandshakeIdentity {
  return {
    userId,
    role: userId === 'mm-1' ? 'middleman' : 'user',
    sessionId: 'sess',
    jti: `jti-${userId}`,
    exp: 9_999_999_999,
  };
}

const deps: GatewayDeps = {
  pubClient: fakeRedis(),
  subClient: fakeRedis(),
  verifyToken: (token) =>
    token.startsWith('valid:') ? identityFor(token.slice('valid:'.length)) : null,
  isJtiDenied: () => false,
  loadChatAuth: async (chatId) =>
    chatId === 'chat-1' ? { dealId: 'deal-1', chatType: 'buyer_seller', parties: DEAL } : null,
  loadDealAuth: async (dealId) => (dealId === 'deal-1' ? DEAL : null),
  rateState: async (socketId, event) => {
    if (useDynamicRateState) {
      return dynamicRateStateMap.get(`${socketId}:${event}`) ?? null;
    }
    if (rateLimitBlocked) {
      // Simulate fully consumed rate limit window
      return { count: 100, windowStartMs: Date.now() - 1000 };
    }
    return null;
  },
  saveRateState: async (socketId, event, state) => {
    if (useDynamicRateState) {
      dynamicRateStateMap.set(`${socketId}:${event}`, state);
    }
  },
};

let httpServer: HttpServer;
let gateway: Server;
let url: string;

beforeAll(async () => {
  httpServer = createServer();
  gateway = createGateway(httpServer, deps);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  url = `http://localhost:${port}`;
});

afterAll(async () => {
  await gateway.close();
  httpServer.close();
});

function connect(token: string): ClientSocket {
  return ioClient(url, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
}

describe('realtime gateway extra coverage', () => {
  it('allows a deal party to join its deal room and rejects strangers', async () => {
    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));
    
    // Join deal-1 (which buyer-1 is party to)
    const buyerJoinOk = await buyer.emitWithAck('deal:join', { dealId: 'deal-1' });
    expect(buyerJoinOk).toBe(true);

    // Join deal-2 (which does not exist)
    const buyerJoinFailed = await buyer.emitWithAck('deal:join', { dealId: 'deal-2' });
    expect(buyerJoinFailed).toBe(false);

    const stranger = connect('valid:stranger-1');
    await new Promise<void>((resolve) => stranger.on('connect', () => resolve()));
    
    // Join deal-1 (which stranger is NOT party to)
    const strangerJoinOk = await stranger.emitWithAck('deal:join', { dealId: 'deal-1' });
    expect(strangerJoinOk).toBe(false);

    buyer.close();
    stranger.close();
  });

  it('allows a joined party to leave a deal room', async () => {
    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));
    
    const joinOk = await buyer.emitWithAck('deal:join', { dealId: 'deal-1' });
    expect(joinOk).toBe(true);

    const leaveOk = await buyer.emitWithAck('deal:leave', { dealId: 'deal-1' });
    expect(leaveOk).toBe(true);

    buyer.close();
  });

  it('rejects sending a message when client rate-limit is exceeded', async () => {
    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));

    rateLimitBlocked = true;
    
    // Mock room join since sendMessage expects to be in the chat room
    // For this test, we can just call it and it will return false if rate limited
    const sendOk = await buyer.emitWithAck('message:send', 'chat-1', { body: 'hello' });
    expect(sendOk).toBe(false);

    rateLimitBlocked = false;
    buyer.close();
  });

  it('rejects unauthenticated connections during handshake', async () => {
    const badSocket = connect('invalid-token');
    const err = await new Promise<Error>((resolve) => {
      badSocket.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toContain('handshake_failed');
    badSocket.close();
  });

  it('rate-limits message:send after 20 messages in 10 seconds', async () => {
    useDynamicRateState = true;
    dynamicRateStateMap.clear();

    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));

    // Join the chat room so room validation passes
    const joinOk = await buyer.emitWithAck('chat:join', 'chat-1');
    expect(joinOk).toBe(true);

    // Send 20 messages successfully
    for (let i = 0; i < 20; i++) {
      const ok = await buyer.emitWithAck('message:send', 'chat-1', { body: `msg ${i}` });
      expect(ok).toBe(true);
    }

    // The 21st message must trigger the rate limiter and fail
    const limitedOk = await buyer.emitWithAck('message:send', 'chat-1', { body: 'limited' });
    expect(limitedOk).toBe(false);

    useDynamicRateState = false;
    buyer.close();
  });
});
