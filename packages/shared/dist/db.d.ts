import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
/**
 * Return the shared PostgreSQL pool, creating it lazily on first use. No
 * connection is opened until a query runs.
 */
export declare function getPool(): Pool;
/** Convenience query helper that runs against the shared pool. */
export declare function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
/** Acquire a dedicated client from the pool (for transactions). */
export declare function getClient(): Promise<PoolClient>;
/**
 * Run `work` inside a single database transaction, committing on success and
 * rolling back on any error. The dedicated client is always released. Use this
 * for non-money multi-statement writes that must be atomic; money/state writes
 * go through `runMoneyWrite` in the API (idempotency + optimistic locking).
 */
export declare function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
/**
 * Close the shared pool and release all connections. Safe to call when no pool
 * was ever created. Used on graceful shutdown.
 */
export declare function closePool(): Promise<void>;
export { default as pg } from 'pg';
//# sourceMappingURL=db.d.ts.map