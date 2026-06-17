/**
 * Changelog read service (Build Spec §3 "Support / misc"). Public, read-only:
 * returns published entries newest-first for the "what's new" feed.
 */
import { listPublishedEntries, type ChangelogEntryRow } from './changelog.repository.js';

export interface ChangelogEntryView {
  id: string;
  version: string | null;
  title: string | null;
  body: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toView(row: ChangelogEntryRow): ChangelogEntryView {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    body: row.body,
    publishedAt: toIso(row.published_at),
    createdAt: toIso(row.created_at) as string,
  };
}

export async function listChangelog(): Promise<ChangelogEntryView[]> {
  const rows = await listPublishedEntries();
  return rows.map(toView);
}
