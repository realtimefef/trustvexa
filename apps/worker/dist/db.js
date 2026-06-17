/**
 * Worker database access.
 *
 * Wraps the shared lazy PostgreSQL pool in the minimal `{ query }` client shape
 * the API repository functions expect, plus a `withTransaction` helper that
 * runs a unit of work inside BEGIN/COMMIT with automatic ROLLBACK on error.
 * Importing this module never opens a connection (the shared pool is lazy).
 */
import { query, getClient } from '@trustvexa/shared/db';
/** Pool-backed client for single statements (each runs on its own connection). */
export const db = {
    async query(text, params) {
        const res = await query(text, params);
        return { rows: res.rows, rowCount: res.rowCount };
    },
};
/**
 * Run `fn` inside a single transaction on a dedicated pooled connection.
 * Commits on success, rolls back on any error, and always releases the client.
 */
export const withTransaction = async (fn) => {
    const client = await getClient();
    const tx = {
        async query(text, params) {
            const res = await client.query(text, params);
            return { rows: res.rows, rowCount: res.rowCount };
        },
    };
    try {
        await client.query('BEGIN');
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};
//# sourceMappingURL=db.js.map