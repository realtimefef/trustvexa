/**
 * Shared Redis client module.
 *
 * Consumed by `@trustvexa/api` and `@trustvexa/worker`. Redis backs rate
 * limiting, the JWT denylist, presence, the Socket.IO adapter, BullMQ queues,
 * caching, locks, idempotency, and counters — never durable money state.
 * *(Requirements 43.5, 45.8)*
 *
 * Lazy/factory pattern: importing this module never opens a real connection.
 * Clients are created with `lazyConnect` so a socket is only opened on the
 * first command (or an explicit `.connect()`), keeping builds and tests free of
 * a live Redis. The connection string is read from `REDIS_URL`; no credentials
 * are hardcoded.
 */
import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
/**
 * Create a brand-new Redis connection. BullMQ requires its own dedicated
 * connections (one per Queue/Worker) and mandates `maxRetriesPerRequest: null`,
 * so callers that need an isolated connection use this factory rather than the
 * shared singleton.
 */
export declare function createRedisConnection(overrides?: RedisOptions): Redis;
/**
 * Return the shared Redis client, creating it lazily on first use. No socket is
 * opened until the first command is issued.
 */
export declare function getRedis(): Redis;
/**
 * Close the shared Redis client and release the connection. Safe to call when
 * no client was ever created. Used on graceful shutdown.
 */
export declare function closeRedis(): Promise<void>;
//# sourceMappingURL=redis.d.ts.map