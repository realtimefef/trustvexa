/**
 * Worker database access.
 *
 * Wraps the shared lazy PostgreSQL pool in the minimal `{ query }` client shape
 * the API repository functions expect, plus a `withTransaction` helper that
 * runs a unit of work inside BEGIN/COMMIT with automatic ROLLBACK on error.
 * Importing this module never opens a connection (the shared pool is lazy).
 */
import { query, getClient } from '@trustvexa/shared/db';

/** Minimal query client accepted by the API repository functions. */
export interface DbClient {
  query<R = unknown>(
    text: string,
    params?: readonly unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

/** Pool-backed client for single statements (each runs on its own connection). */
export const db: DbClient = {
  async query<R = unknown>(text: string, params?: readonly unknown[]) {
    const res = await query<Record<string, unknown>>(text, params);
    return { rows: res.rows as unknown as R[], rowCount: res.rowCount };
  },
};

export type WithTransaction = <T>(fn: (tx: DbClient) => Promise<T>) => Promise<T>;

/**
 * Run `fn` inside a single transaction on a dedicated pooled connection.
 * Commits on success, rolls back on any error, and always releases the client.
 */
export const withTransaction: WithTransaction = async (fn) => {
  const client = await getClient();
  const tx: DbClient = {
    async query<R = unknown>(text: string, params?: readonly unknown[]) {
      const res = await client.query(text, params as unknown[] | undefined);
      return { rows: res.rows as unknown as R[], rowCount: res.rowCount };
    },
  };
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
