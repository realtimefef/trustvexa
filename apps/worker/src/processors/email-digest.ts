/**
 * Email digest processor.
 *
 * Runs on a daily (08:00 UTC) and weekly (Monday 08:00 UTC) cron schedule.
 * For each trigger it:
 *  1. Queries users whose `email_digest_frequency` preference matches the
 *     current run type (daily or weekly).
 *  2. Collects their unread notifications from the appropriate time window.
 *  3. Renders a batched digest email via the `getDigestEmail` template.
 *  4. Enqueues one `email` job per user via BullMQ.
 *
 * The `immediate` send path in the notification-fanout processor is unchanged.
 */
import type { Job } from 'bullmq';
import { Queue } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { createRedisConnection } from '@trustvexa/shared/redis';
import { getDigestEmail, type DigestNotification } from '../email-templates/index.js';
import { openPii } from '@trustvexa/api/worker-jobs';

/** Job names used by the cron scheduler. */
export const DAILY_DIGEST_JOB = 'daily-digest' as const;
export const WEEKLY_DIGEST_JOB = 'weekly-digest' as const;

type DigestFrequency = 'daily' | 'weekly';

interface DigestUserRow {
  user_id: string;
  email_enc: string;
  username: string;
}

interface NotificationRow {
  id: string;
  type: string;
  payload: string;
  deal_id: string | null;
  created_at: string;
}

/**
 * Determine the digest frequency from the job name.
 * Falls back to 'daily' for unknown job names.
 */
function frequencyFromJobName(name: string): DigestFrequency {
  return name === WEEKLY_DIGEST_JOB ? 'weekly' : 'daily';
}

/** Hours to look back for each digest type. */
const LOOKBACK_HOURS: Record<DigestFrequency, number> = {
  daily: 24,
  weekly: 168, // 7 * 24
};

export async function processEmailDigest(job: Job, ctx: ProcessorContext): Promise<void> {
  const frequency = frequencyFromJobName(job.name);
  const lookbackHours = LOOKBACK_HOURS[frequency];
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  ctx.logger.info({ frequency, cutoff, job_id: job.id }, 'email digest sweep starting');

  // 1. Find users with this digest frequency preference
  const usersResult = await ctx.db.query<DigestUserRow>(
    `SELECT u.id AS user_id, u.email_enc, u.username
       FROM users u
       JOIN user_preferences up ON up.user_id = u.id
      WHERE up.email_digest_frequency = $1`,
    [frequency],
  );

  if (usersResult.rows.length === 0) {
    ctx.logger.info({ frequency }, 'no users with this digest frequency — skipping');
    return;
  }

  ctx.logger.info(
    { frequency, user_count: usersResult.rows.length },
    'processing digest for users',
  );

  let emailsQueued = 0;
  const emailQueue = new Queue('email', { connection: createRedisConnection() });

  try {
    for (const user of usersResult.rows) {
      const email = await openPii(user.email_enc);
      if (!email) {
        continue;
      }

      // 2. Gather unread notifications within the window that haven't been digested
      const notifsResult = await ctx.db.query<NotificationRow>(
        `SELECT id, type, payload::text, deal_id, created_at
           FROM notifications
          WHERE user_id = $1
            AND read_at IS NULL
            AND digest_sent_at IS NULL
            AND created_at >= $2
          ORDER BY created_at DESC
          LIMIT 50`,
        [user.user_id, cutoff],
      );

      if (notifsResult.rows.length === 0) {
        continue; // No unread notifications — skip this user
      }

      // 3. Build the digest notification list
      const digestItems: DigestNotification[] = notifsResult.rows.map((row) => {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(row.payload);
        } catch {
          /* payload may not be valid JSON; use empty */
        }
        return {
          type: row.type,
          dealTitle: (payload.dealTitle as string) || undefined,
          summary:
            (payload.summary as string) ||
            (payload.message as string) ||
            row.type.replace(/[_:]/g, ' '),
          createdAt: new Date(row.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      });

      // 4. Render and enqueue the digest email
      const html = getDigestEmail({
        username: user.username,
        frequency,
        notifications: digestItems,
        dashboardUrl: 'https://trustvexa.com/dashboard',
      });

      await emailQueue.add('digest-email', {
        to: email,
        subject: `Your ${frequency === 'daily' ? 'Daily' : 'Weekly'} TrustVexa Digest — ${digestItems.length} notification${digestItems.length > 1 ? 's' : ''}`,
        html,
      });

      // Mark included notifications as sent in digest
      const notifIds = notifsResult.rows.map((r) => r.id);
      await ctx.db.query(
        `UPDATE notifications
            SET digest_sent_at = now()
          WHERE id = ANY($1)`,
        [notifIds],
      );

      emailsQueued++;
    }
  } finally {
    await emailQueue.close();
  }

  ctx.logger.info(
    { frequency, users_checked: usersResult.rows.length, emails_queued: emailsQueued },
    'email digest sweep complete',
  );
}
