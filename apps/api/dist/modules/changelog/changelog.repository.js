/**
 * Read-only persistence for published changelog entries (Build Spec §3
 * "Support / misc"). An entry is "published" once `published_at` is set; drafts
 * (null `published_at`) are excluded. Real columns from the migration are used
 * verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';
/** List published changelog entries, newest first. */
export async function listPublishedEntries() {
    const res = await query(`SELECT id, version, title, body, published_at, created_at
       FROM changelog_entries
      WHERE published_at IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 100`);
    return res.rows;
}
//# sourceMappingURL=changelog.repository.js.map