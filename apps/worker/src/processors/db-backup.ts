import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Queue } from 'bullmq';
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { getObjectStorage } from '@trustvexa/api/worker-jobs';
import { createRedisConnection } from '@trustvexa/shared/redis';

export async function processDbBackup(_job: Job, ctx: ProcessorContext): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    ctx.logger.error('DATABASE_URL not set. Skipping scheduled DB backup.');
    return;
  }

  const startedAt = new Date();

  // 1. Insert initial backup record as pending
  const insertRes = await ctx.db.query<{ id: string }>(
    `INSERT INTO backup_jobs (backup_type, status, started_at)
     VALUES ('daily', 'pending', $1)
     RETURNING id`,
    [startedAt],
  );
  const dbBackupJobId = insertRes.rows[0]?.id;

  const backupFilename = `db_backup_${Date.now()}.sql`;
  const dumpPath = path.join(os.tmpdir(), backupFilename);
  ctx.logger.info({ dumpPath }, 'Starting pg_dump for scheduled database backup');

  try {
    // 2. Run pg_dump
    execFileSync('pg_dump', [dbUrl, '-f', dumpPath, '--no-owner', '--clean'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    // 3. Read the dump bytes
    const bytes = fs.readFileSync(dumpPath);

    // 4. Upload to Object Storage
    const storage = getObjectStorage();
    const storageKey = `backups/${backupFilename}`;
    await storage.put(storageKey, bytes, 'application/sql');

    const completedAt = new Date();
    await ctx.db.query(
      `UPDATE backup_jobs 
       SET status = 'success', completed_at = $1, storage_location = $2
       WHERE id = $3`,
      [completedAt, storageKey, dbBackupJobId],
    );

    ctx.logger.info({ storageKey }, 'Database backup complete and stored in object storage.');

    // Clean up local temp file
    fs.unlinkSync(dumpPath);
  } catch (err) {
    ctx.logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'Database backup failed',
    );

    const completedAt = new Date();
    if (dbBackupJobId) {
      await ctx.db.query(
        `UPDATE backup_jobs 
         SET status = 'failed', completed_at = $1
         WHERE id = $2`,
        [completedAt, dbBackupJobId],
      );
    }

    // Clean up local temp file if it exists
    if (fs.existsSync(dumpPath)) {
      fs.unlinkSync(dumpPath);
    }

    // WORKER-CRIT-2 FIX: Use raw HTML email instead of a template that expects
    // completely different data (sla-warning expects { username, dealTitle, hoursLeft }
    // which would all be undefined here, producing a broken empty email).
    try {
      const emailQueue = new Queue('email', { connection: createRedisConnection() });
      const errMsg = err instanceof Error ? err.message : String(err);
      await emailQueue.add('admin-backup-failure', {
        to: process.env.ADMIN_EMAIL || 'admin@trustvexa.com',
        subject: '🚨 TrustVexa: Daily DB Backup FAILED',
        html: `
          <div style="font-family:sans-serif;padding:24px;background:#111827;color:#f3f4f6;border-radius:12px;max-width:600px;margin:0 auto">
            <h2 style="color:#ef4444;margin-top:0">Database Backup Failure</h2>
            <p>The scheduled daily database backup failed at <strong>${startedAt.toISOString()}</strong>.</p>
            <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px;font-family:monospace;font-size:13px;color:#f87171;margin:16px 0">
              ${errMsg}
            </div>
            <p style="color:#9ca3af">Immediate action required. Check the worker logs and restore from the last successful backup if needed.</p>
          </div>`,
      });
      await emailQueue.close();
    } catch (emailErr) {
      ctx.logger.error({ emailErr }, 'Failed to enqueue backup failure alert email');
    }

    throw err;
  }
}
