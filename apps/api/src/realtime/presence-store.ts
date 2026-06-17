// Redis-backed presence + typing store (task 6.1/6.5).
// Presence is ephemeral and lives only in Redis (never durable state). Keys are
// namespaced per deal so the gateway can compute who is online before applying
// the presence-privacy rules. All writes carry a TTL so stale presence expires.
// (Requirements 28.1, 28.2, 30.7)

import type { Redis } from 'ioredis';

export const PRESENCE_TTL_SECONDS = 60;

function presenceKey(dealId: string): string {
  return `presence:deal:${dealId}`;
}
function typingKey(chatId: string): string {
  return `typing:chat:${chatId}`;
}

/** Mark a user online for a deal, refreshing the TTL. */
export async function setOnline(redis: Redis, dealId: string, userId: string): Promise<void> {
  const key = presenceKey(dealId);
  await redis.hset(key, userId, Date.now().toString());
  await redis.expire(key, PRESENCE_TTL_SECONDS);
}

/** Remove a user's presence for a deal (explicit disconnect). */
export async function setOffline(redis: Redis, dealId: string, userId: string): Promise<void> {
  await redis.hdel(presenceKey(dealId), userId);
}

/** List the user ids currently marked online for a deal. */
export async function onlineUserIds(redis: Redis, dealId: string): Promise<string[]> {
  const map = await redis.hgetall(presenceKey(dealId));
  return Object.keys(map);
}

/** Record that a user started typing in a chat (short TTL auto-clears it). */
export async function setTyping(
  redis: Redis,
  chatId: string,
  userId: string,
  ttlSeconds = 10,
): Promise<void> {
  const key = typingKey(chatId);
  await redis.hset(key, userId, Date.now().toString());
  await redis.expire(key, ttlSeconds);
}

/** Clear a user's typing indicator in a chat. */
export async function clearTyping(redis: Redis, chatId: string, userId: string): Promise<void> {
  await redis.hdel(typingKey(chatId), userId);
}
