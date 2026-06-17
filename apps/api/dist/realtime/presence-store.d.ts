import type { Redis } from 'ioredis';
export declare const PRESENCE_TTL_SECONDS = 60;
/** Mark a user online for a deal, refreshing the TTL. */
export declare function setOnline(redis: Redis, dealId: string, userId: string): Promise<void>;
/** Remove a user's presence for a deal (explicit disconnect). */
export declare function setOffline(redis: Redis, dealId: string, userId: string): Promise<void>;
/** List the user ids currently marked online for a deal. */
export declare function onlineUserIds(redis: Redis, dealId: string): Promise<string[]>;
/** Record that a user started typing in a chat (short TTL auto-clears it). */
export declare function setTyping(redis: Redis, chatId: string, userId: string, ttlSeconds?: number): Promise<void>;
/** Clear a user's typing indicator in a chat. */
export declare function clearTyping(redis: Redis, chatId: string, userId: string): Promise<void>;
//# sourceMappingURL=presence-store.d.ts.map