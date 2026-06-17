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

let client: Redis | null = null;

/** Read the Redis connection string from the environment. */
function getConnectionUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    throw new Error(
      'REDIS_URL is not set. The Redis connection string is provided by Render (Requirement 41.7).',
    );
  }
  return url;
}

/**
 * Create a brand-new Redis connection. BullMQ requires its own dedicated
 * connections (one per Queue/Worker) and mandates `maxRetriesPerRequest: null`,
 * so callers that need an isolated connection use this factory rather than the
 * shared singleton.
 */
export function createRedisConnection(overrides: RedisOptions = {}): Redis {
  const url = getConnectionUrl();
  const options: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...overrides,
  };
  if (url.startsWith('rediss://')) {
    options.tls = {};
  }
  return new Redis(url, options);
}

/**
 * Return the shared Redis client, creating it lazily on first use. No socket is
 * opened until the first command is issued.
 */
export function getRedis(): Redis {
  if (client === null) {
    client = createRedisConnection();
    client.on('error', (err: Error) => {
      console.error('[redis] client error:', err.message);
    });
  }
  return client;
}

/**
 * Close the shared Redis client and release the connection. Safe to call when
 * no client was ever created. Used on graceful shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (client !== null) {
    const current = client;
    client = null;
    await current.quit();
  }
}
