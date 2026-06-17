const BATCH_SIZE = 5_000;
export async function processIdempotencyCleanup(_job, ctx) {
    let totalDeleted = 0;
    // Delete in batches to avoid a single huge DELETE that could lock the table.
    // Loop until fewer than BATCH_SIZE rows are affected (last batch).
    while (true) {
        const result = await ctx.db.query(`WITH deleted AS (
         DELETE FROM idempotency_keys
         WHERE id IN (
           SELECT id FROM idempotency_keys
           WHERE expires_at < now()
           LIMIT $1
         )
         RETURNING id
       )
       SELECT count(*)::text AS count FROM deleted`, [BATCH_SIZE]);
        const deleted = Number(result.rows[0]?.count ?? 0);
        totalDeleted += deleted;
        if (deleted < BATCH_SIZE) {
            break;
        }
    }
    ctx.logger.info({ total_deleted: totalDeleted }, 'idempotency_keys cleanup complete');
}
//# sourceMappingURL=idempotency-cleanup.js.map