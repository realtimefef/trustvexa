'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { getAccessToken } from '@/lib/api/client';

// Zod schemas for incoming socket event payloads — validate before consuming.
// A corrupt or injected payload must never mutate React state unvalidated.
// (Audit FIX-P2-5)
const messageNewEventSchema = z.object({
  chatId: z.string(),
  senderId: z.string(),
  body: z.string(),
  at: z.number(),
});

const typingEventSchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  typing: z.boolean(),
});

const readAckEventSchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  userId: z.string(),
  at: z.number(),
});

export type MessageNewEvent = z.infer<typeof messageNewEventSchema>;
export type TypingEvent = z.infer<typeof typingEventSchema>;
export type ReadAckEvent = z.infer<typeof readAckEventSchema>;

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (chatId: string) => Promise<boolean>;
  sendMessage: (chatId: string, body: string) => Promise<boolean>;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  markRead: (chatId: string, messageId: string) => void;
}

const SocketContext = React.createContext<SocketContextValue | null>(null);

/** Safely parse a raw socket event payload; returns null on invalid shape. */
export function parseMessageNewEvent(raw: unknown): MessageNewEvent | null {
  const result = messageNewEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}
export function parseTypingEvent(raw: unknown): TypingEvent | null {
  const result = typingEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}
export function parseReadAckEvent(raw: unknown): ReadAckEvent | null {
  const result = readAckEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}

const CLIENT_EVENTS = {
  sendMessage: 'message:send',
  startTyping: 'typing:start',
  stopTyping: 'typing:stop',
  markRead: 'read:mark',
  joinChat: 'chat:join',
} as const;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  // Re-run connection lifecycle when auth status changes.
  React.useEffect(() => {
    if (status !== 'authenticated') {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    // In proxy mode (NEXT_PUBLIC_API_BASE_URL is empty), Socket.IO must
    // connect to the same origin with path /socket.io (default). In direct
    // mode it connects to the API origin directly.
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
    const origin = apiBase || window.location.origin;
    const isProxyMode = !apiBase;

    const newSocket = io(origin, {
      auth: { token },
      // In proxy mode Next.js can't easily proxy WebSocket upgrades, so we
      // fall back to HTTP long-polling which works through the rewrite rule.
      transports: isProxyMode ? ['polling'] : ['websocket', 'polling'],
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle token refresh updates by updating auth details dynamically on reconnection
    const tokenCheckInterval = setInterval(() => {
      const currentToken = getAccessToken();
      if (newSocket.auth && (newSocket.auth as { token?: string }).token !== currentToken) {
        newSocket.auth = { token: currentToken };
      }
    }, 10_000);

    setSocket(newSocket);

    return () => {
      clearInterval(tokenCheckInterval);
      newSocket.disconnect();
    };
  }, [status]);

  const joinChat = React.useCallback(
    (chatId: string) => {
      return new Promise<boolean>((resolve) => {
        if (!socket || !socket.connected) {
          resolve(false);
          return;
        }
        socket.emit(CLIENT_EVENTS.joinChat, chatId, (ok: unknown) => {
          resolve(!!ok);
        });
      });
    },
    [socket],
  );

  const sendMessage = React.useCallback(
    (chatId: string, body: string) => {
      return new Promise<boolean>((resolve) => {
        if (!socket || !socket.connected) {
          resolve(false);
          return;
        }
        socket.emit(CLIENT_EVENTS.sendMessage, chatId, { body }, (ok: unknown) => {
          resolve(!!ok);
        });
      });
    },
    [socket],
  );

  const startTyping = React.useCallback(
    (chatId: string) => {
      if (socket?.connected) {
        socket.emit(CLIENT_EVENTS.startTyping, chatId);
      }
    },
    [socket],
  );

  const stopTyping = React.useCallback(
    (chatId: string) => {
      if (socket?.connected) {
        socket.emit(CLIENT_EVENTS.stopTyping, chatId);
      }
    },
    [socket],
  );

  const markRead = React.useCallback(
    (chatId: string, messageId: string) => {
      if (socket?.connected) {
        socket.emit(CLIENT_EVENTS.markRead, chatId, messageId);
      }
    },
    [socket],
  );

  const value = React.useMemo<SocketContextValue>(
    () => ({
      socket,
      isConnected,
      joinChat,
      sendMessage,
      startTyping,
      stopTyping,
      markRead,
    }),
    [socket, isConnected, joinChat, sendMessage, startTyping, stopTyping, markRead],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = React.useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}
