/**
 * Shared PostgreSQL connection pool module.
 *
 * Consumed by `@trustvexa/api` and `@trustvexa/worker`. PostgreSQL is the
 * source of truth and uses connection pooling. *(Requirements 43.4, 43.5, 45.8)*
 *
 * Lazy/factory pattern: importing this module never opens a real connection.
 * The pool is created on the first `getPool()` call and connections are only
 * established when a query is actually issued, so builds and tests do not
 * require a live database. Connection details are read from `DATABASE_URL`;
 * no credentials are hardcoded.
 */
import pg from 'pg';
import type { Pool, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';

const { Pool: PgPool } = pg;

let pool: Pool | null = null;

/** Read the PostgreSQL connection string from the environment. */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error(
      'DATABASE_URL is not set. The PostgreSQL connection string is provided by Render (Requirement 41.7).',
    );
  }
  return url;
}

/**
 * Build the pool configuration from the environment. SSL is enabled outside of
 * local development since Render-managed PostgreSQL requires TLS.
 */
function buildPoolConfig(): PoolConfig {
  const config: PoolConfig = {
    connectionString: getConnectionString(),
    // Pooling bounds (Requirement 43.4 connection pooling). Overridable via env.
    max: Number.parseInt(process.env.PG_POOL_MAX ?? '10', 10),
    idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS ?? '30000', 10),
    connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECTION_TIMEOUT_MS ?? '10000', 10),
  };
  if (process.env.NODE_ENV === 'production' || process.env.PG_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

/**
 * Return the shared PostgreSQL pool, creating it lazily on first use. No
 * connection is opened until a query runs.
 */
export function getPool(): Pool {
  if (pool === null) {
    pool = new PgPool(buildPoolConfig());
    // Surface idle-client errors instead of crashing the process silently.
    pool.on('error', (err: Error) => {
      console.error('[db] idle PostgreSQL client error:', err.message);
    });
  }
  return pool;
}

/** Convenience query helper that runs against the shared pool. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[] | undefined);
}

/** Acquire a dedicated client from the pool (for transactions). */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Run `work` inside a single database transaction, committing on success and
 * rolling back on any error. The dedicated client is always released. Use this
 * for non-money multi-statement writes that must be atomic; money/state writes
 * go through `runMoneyWrite` in the API (idempotency + optimistic locking).
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* transaction already aborted or connection lost */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the shared pool and release all connections. Safe to call when no pool
 * was ever created. Used on graceful shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool !== null) {
    const current = pool;
    pool = null;
    await current.end();
  }
}

export { default as pg } from 'pg';
