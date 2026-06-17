/**
 * Money-write transaction contract (task 5.11, DB-bound).
 * *(Requirements 17.9, 17.10, 17.11, 17.12, 17.13, 17.14, 44.2)*
 *
 * Every money/state-changing write runs through `runMoneyWrite`, which gives
 * three guarantees in ONE database transaction:
 *
 *   1. Idempotency (Req 17.13/17.14): an `Idempotency-Key` is claimed by
 *      inserting a row into `idempotency_keys` with `ON CONFLICT (key) DO
 *      NOTHING`. The unique index serializes concurrent duplicates — the loser
 *      blocks until the winner commits, then observes the stored result and
 *      replays it instead of performing the work twice. A key reused with a
 *      different request payload is rejected (the request hash differs).
 *   2. Optimistic locking (Req 17.11): `lockDealVersion` bumps `deals.version_no`
 *      only `WHERE version_no = :expected`; 0 rows updated means a concurrent
 *      writer won, so the whole transaction aborts with `concurrent_update`.
 *   3. Atomicity (Req 17.12): the key claim, the balanced ledger postings, the
 *      domain row updates, and the audit row all commit together or roll back
 *      together. A failure leaves the deal, ledger, version, and key untouched,
 *      so a retry with the same key can still succeed.
 */
import { createHash } from 'node:crypto';
import { getClient } from '@trustvexa/shared';
import { AppError } from '../../errors/app-error.js';
/** Acquire a dedicated pooled client for a money-write transaction. */
export async function acquireMoneyClient() {
    return (await getClient());
}
/**
 * Deterministic, key-order-independent serialization used to fingerprint a
 * request payload. Object keys are sorted recursively so two equivalent
 * payloads hash identically; `bigint` is encoded losslessly as a string.
 */
export function canonicalize(value) {
    if (value === null || value === undefined)
        return 'null';
    if (typeof value === 'bigint')
        return `"${value.toString()}n"`;
    if (Array.isArray(value))
        return `[${value.map(canonicalize).join(',')}]`;
    if (typeof value === 'object') {
        const record = value;
        const keys = Object.keys(record).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(record[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
/** SHA-256 fingerprint of a request payload for idempotency replay-mismatch detection. */
export function requestHash(payload) {
    return createHash('sha256').update(canonicalize(payload)).digest('hex');
}
/**
 * Bump a deal's optimistic-lock version, asserting it had not advanced. Throws
 * `concurrent_update` (409) when a concurrent writer already won. Must be
 * called inside the money-write transaction.
 */
export async function lockDealVersion(client, dealId, expectedVersion) {
    const res = await client.query(`UPDATE deals SET version_no = version_no + 1, updated_at = now()
      WHERE id = $1 AND version_no = $2`, [dealId, expectedVersion]);
    if ((res.rowCount ?? 0) === 0) {
        throw new AppError('concurrent_update', 'The deal was modified concurrently; reload and retry with the latest version.', 409);
    }
    return expectedVersion + 1;
}
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
/**
 * Execute a money write exactly once per idempotency key, atomically and under
 * an optimistic lock. Returns the (possibly replayed) result.
 */
export async function runMoneyWrite(req) {
    if (!req.idempotencyKey || req.idempotencyKey.length === 0) {
        throw new AppError('idempotency_key_required', 'An Idempotency-Key is required for this request.', 400);
    }
    const hash = requestHash(req.payload);
    const ttl = req.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const client = await (req.clientFactory ?? acquireMoneyClient)();
    try {
        await client.query('BEGIN');
        // Claim the key. The unique index serializes concurrent duplicates.
        const claim = await client.query(`INSERT INTO idempotency_keys
         (key, user_id, action_type, deal_id, request_hash, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'in_progress', $6)
       ON CONFLICT (key) DO NOTHING
       RETURNING id`, [req.idempotencyKey, req.userId, req.actionType, req.dealId ?? null, hash, expiresAt]);
        if (claim.rows.length === 0) {
            // Key already committed by a prior request: replay (or reject mismatch).
            const existing = await client.query(`SELECT request_hash, status, response_ref FROM idempotency_keys WHERE key = $1 LIMIT 1`, [req.idempotencyKey]);
            await client.query('ROLLBACK');
            const row = existing.rows[0];
            if (!row) {
                throw new AppError('idempotency_in_progress', 'A request with this Idempotency-Key is still being processed; retry shortly.', 409);
            }
            if (row.request_hash !== hash) {
                throw new AppError('idempotency_key_reused', 'This Idempotency-Key was already used with a different request payload.', 422);
            }
            if (row.status !== 'succeeded' || row.response_ref === null) {
                throw new AppError('idempotency_in_progress', 'A request with this Idempotency-Key is still being processed; retry shortly.', 409);
            }
            return { replayed: true, result: JSON.parse(row.response_ref) };
        }
        // We own the key: perform the work and record the result, all-or-nothing.
        const result = await req.work(client);
        await client.query(`UPDATE idempotency_keys SET status = 'succeeded', response_ref = $2 WHERE key = $1`, [req.idempotencyKey, JSON.stringify(result ?? null)]);
        await client.query('COMMIT');
        return { replayed: false, result };
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* transaction already aborted or connection lost */
        }
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=money-write.js.map