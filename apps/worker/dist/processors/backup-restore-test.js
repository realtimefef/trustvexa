import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pg } from '@trustvexa/shared';
export async function runBackupRestoreTest(ctx) {
    const dbUrl = process.env.DATABASE_URL;
    const testDbUrl = process.env.DATABASE_URL_TEST;
    if (!dbUrl || !testDbUrl) {
        ctx.logger.warn('DATABASE_URL or DATABASE_URL_TEST not set. Skipping backup restore test.');
        return;
    }
    // 1. Trigger a pg_dump of the current DB to a temp file
    // Using temp file within workspace as requested
    const dumpPath = path.join(os.tmpdir(), `trustvexa_restore_test_${Date.now()}.sql`);
    ctx.logger.info({ dumpPath }, 'Starting pg_dump for backup restore test');
    try {
        execFileSync('pg_dump', [dbUrl, '-f', dumpPath, '--no-owner', '--clean'], {
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        // 2. Restore into a scratch DB
        ctx.logger.info('Restoring database schema into DATABASE_URL_TEST');
        execFileSync('psql', [testDbUrl, '-f', dumpPath], {
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        // 3. Run a smoke query on the restored DB
        ctx.logger.info('Running smoke query verification on restored database');
        const client = new pg.Client({ connectionString: testDbUrl });
        await client.connect();
        try {
            const result = await client.query('SELECT COUNT(*) FROM users');
            if (!result.rows[0]) {
                throw new Error('Restore verification query returned no rows');
            }
            ctx.logger.info({ userCount: result.rows[0].count }, 'Restore verification query succeeded');
        }
        finally {
            await client.end();
        }
        // 4. Log success to backup_jobs table
        await ctx.db.query(`INSERT INTO backup_jobs (backup_type, status, completed_at) VALUES ('restore_test', 'success', now())`);
        ctx.logger.info('Backup restore test logged successfully to backup_jobs');
    }
    catch (err) {
        ctx.logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Backup restore test failed');
        await ctx.db.query(`INSERT INTO backup_jobs (backup_type, status, completed_at) VALUES ('restore_test', 'failed', now())`);
        throw err;
    }
    finally {
        // 5. Clean up
        await fs.promises.rm(dumpPath, { force: true });
    }
}
//# sourceMappingURL=backup-restore-test.js.map