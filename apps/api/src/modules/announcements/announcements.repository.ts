/**
 * Persistence for announcements + per-user read state (Build Spec §3
 * "Support / misc").
 *
 * The active-announcements read left-joins `announcement_reads` for the caller
 * so each row carries that user's read timestamp (or null). The read-state
 * write upserts on the UNIQUE(announcement_id, user_id) constraint, keeping the
 * first read time so repeated calls are idempotent. Real columns from the
 * migration are used verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';

export interface AnnouncementRow {
  id: string;
  title: string | null;
  body: string | null;
  audience: string | null;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  created_at: Date | string;
  read_at: Date | string | null;
}

/**
 * List currently-active announcements visible to `audience`, with the caller's
 * read timestamp. "Active" means the start window has opened (or is unset) and
 * the end window has not closed (or is unset). Audience matches `all`, the
 * caller's audience term, or an unset audience.
 */
export async function listActiveForAudience(
  userId: string,
  audience: string,
): Promise<AnnouncementRow[]> {
  const res = await query<AnnouncementRow>(
    `SELECT a.id, a.title, a.body, a.audience, a.starts_at, a.ends_at, a.created_at,
            ar.read_at
       FROM announcements a
       LEFT JOIN announcement_reads ar
         ON ar.announcement_id = a.id AND ar.user_id = $1
      WHERE (a.starts_at IS NULL OR a.starts_at <= now())
        AND (a.ends_at IS NULL OR a.ends_at > now())
        AND (a.audience IS NULL OR a.audience = 'all' OR a.audience = $2)
      ORDER BY a.created_at DESC
      LIMIT 100`,
    [userId, audience],
  );
  return res.rows;
}

/** Whether an announcement exists at all (visibility-independent). */
export async function announcementExists(id: string): Promise<boolean> {
  const res = await query(`SELECT 1 FROM announcements WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Mark an announcement read for the caller, returning the (preserved) read
 * timestamp. Idempotent: a repeat keeps the original `read_at`.
 */
export async function markAnnouncementRead(
  announcementId: string,
  userId: string,
): Promise<string> {
  const res = await query<{ read_at: Date | string | null }>(
    `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (announcement_id, user_id)
     DO UPDATE SET read_at = COALESCE(announcement_reads.read_at, EXCLUDED.read_at)
     RETURNING read_at`,
    [announcementId, userId],
  );
  const value = res.rows[0]?.read_at ?? new Date();
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function getAnnouncementForUser(
  announcementId: string,
  userId: string,
  audience: string,
): Promise<AnnouncementRow | null> {
  const res = await query<AnnouncementRow>(
    `SELECT a.id, a.title, a.body, a.audience, a.starts_at, a.ends_at, a.created_at,
            ar.read_at
       FROM announcements a
       LEFT JOIN announcement_reads ar
         ON ar.announcement_id = a.id AND ar.user_id = $2
      WHERE a.id = $1
        AND (a.starts_at IS NULL OR a.starts_at <= now())
        AND (a.ends_at IS NULL OR a.ends_at > now())
        AND (a.audience IS NULL OR a.audience = 'all' OR a.audience = $3)
      LIMIT 1`,
    [announcementId, userId, audience],
  );
  return res.rows[0] ?? null;
}
