/**
 * Announcements read/read-state service (Build Spec §3 "Support / misc").
 *
 * The caller's audience is derived from their JWT role: a `user` sees `users`
 * announcements, a `middleman` sees `middleman` announcements, and everyone
 * sees `all`. Marking read is idempotent.
 */
import { notFound } from '../../errors/app-error.js';
import {
  announcementExists,
  listActiveForAudience,
  markAnnouncementRead,
  getAnnouncementForUser,
  type AnnouncementRow,
} from './announcements.repository.js';

export interface AnnouncementView {
  id: string;
  title: string | null;
  body: string | null;
  audience: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

export interface MarkReadResult {
  announcementId: string;
  read: true;
  readAt: string;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Map a JWT role to the `announcements.audience` term it should see. */
export function audienceForRole(role: 'user' | 'middleman' | null): string {
  return role === 'middleman' ? 'middleman' : 'users';
}

function toView(row: AnnouncementRow): AnnouncementView {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    createdAt: toIso(row.created_at) as string,
    read: row.read_at !== null,
    readAt: toIso(row.read_at),
  };
}

export async function listAnnouncements(
  userId: string,
  role: 'user' | 'middleman' | null,
): Promise<AnnouncementView[]> {
  const rows = await listActiveForAudience(userId, audienceForRole(role));
  return rows.map(toView);
}

export async function markRead(userId: string, announcementId: string): Promise<MarkReadResult> {
  if (!(await announcementExists(announcementId))) {
    throw notFound('Announcement not found.');
  }
  const readAt = await markAnnouncementRead(announcementId, userId);
  return { announcementId, read: true, readAt };
}

export async function getAnnouncement(
  userId: string,
  announcementId: string,
  role: 'user' | 'middleman' | null,
): Promise<AnnouncementView> {
  const row = await getAnnouncementForUser(announcementId, userId, audienceForRole(role));
  if (!row) {
    throw notFound('Announcement not found.');
  }
  return toView(row);
}
