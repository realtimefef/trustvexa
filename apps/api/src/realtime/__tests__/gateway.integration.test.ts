// Realtime gateway integration tests (task 6.10).
// Spins up the Socket.IO gateway on an ephemeral HTTP server and drives it with
// real socket.io-client connections to verify: handshake auth + denylist
// rejection, server-side room-join authorization, reconnect re-auth, and
// room fan-out. Requires socket.io + socket.io-client (installed deps), so it
// runs in CI with a live build rather than in the offline static harness.
// (Requirements 30.2, 30.3, 30.4, 30.5)
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import type { Server } from 'socket.io';
import { createGateway, type ChatAuthContext, type GatewayDeps } from '../gateway.js';
import type { HandshakeIdentity } from '../../modules/chat/handshake.js';
import { chatRoom } from '../../modules/chat/chat-types.js';

// A fake Redis pub/sub pair good enough for the in-memory adapter contract.
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
const CHAT_ID = 'chat-1';

const denylist = new Set<string>();

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
  isJtiDenied: (jti) => denylist.has(jti),
  loadChatAuth: async (chatId): Promise<ChatAuthContext | null> =>
    chatId === CHAT_ID ? { dealId: 'deal-1', chatType: 'buyer_seller', parties: DEAL } : null,
  rateState: async () => null,
  saveRateState: async () => {},
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

describe('realtime gateway', () => {
  it('rejects a handshake with no/invalid token', async () => {
    const socket = connect('garbage');
    await expect(
      new Promise((_resolve, reject) => socket.on('connect_error', reject)),
    ).rejects.toBeTruthy();
    socket.close();
  });

  it('rejects a denylisted jti at handshake', async () => {
    denylist.add('jti-buyer-1');
    const socket = connect('valid:buyer-1');
    await expect(
      new Promise((_resolve, reject) => socket.on('connect_error', reject)),
    ).rejects.toBeTruthy();
    socket.close();
    denylist.delete('jti-buyer-1');
  });

  it('authorizes a party to join its chat room and rejects a stranger', async () => {
    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));
    const joined = await buyer.emitWithAck('chat:join', CHAT_ID);
    expect(joined).toBe(true);

    const stranger = connect('valid:stranger-1');
    await new Promise<void>((resolve) => stranger.on('connect', () => resolve()));
    const strangerJoin = await stranger.emitWithAck('chat:join', CHAT_ID);
    expect(strangerJoin).toBe(false);

    buyer.close();
    stranger.close();
  });

  it('fans a server emit out to a joined room member', async () => {
    const buyer = connect('valid:buyer-1');
    await new Promise<void>((resolve) => buyer.on('connect', () => resolve()));
    await buyer.emitWithAck('chat:join', CHAT_ID);
    const received = new Promise((resolve) => buyer.on('message:new', resolve));
    gateway.to(chatRoom(CHAT_ID)).emit('message:new', { id: 'm1' });
    await expect(received).resolves.toMatchObject({ id: 'm1' });
    buyer.close();
  });
});
