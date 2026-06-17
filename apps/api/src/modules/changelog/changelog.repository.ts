/**
 * Read-only persistence for published changelog entries (Build Spec §3
 * "Support / misc"). An entry is "published" once `published_at` is set; drafts
 * (null `published_at`) are excluded. Real columns from the migration are used
 * verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';

export interface ChangelogEntryRow {
  id: string;
  version: string | null;
  title: string | null;
  body: string | null;
  published_at: Date | string | null;
  created_at: Date | string;
}

/** List published changelog entries, newest first. */
export async function listPublishedEntries(): Promise<ChangelogEntryRow[]> {
  const res = await query<ChangelogEntryRow>(
    `SELECT id, version, title, body, published_at, created_at
       FROM changelog_entries
      WHERE published_at IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 100`,
  );
  return res.rows;
}
