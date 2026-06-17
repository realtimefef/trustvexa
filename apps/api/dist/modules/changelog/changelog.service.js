/**
 * Changelog read service (Build Spec §3 "Support / misc"). Public, read-only:
 * returns published entries newest-first for the "what's new" feed.
 */
import { listPublishedEntries } from './changelog.repository.js';
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
function toView(row) {
    return {
        id: row.id,
        version: row.version,
        title: row.title,
        body: row.body,
        publishedAt: toIso(row.published_at),
        createdAt: toIso(row.created_at),
    };
}
export async function listChangelog() {
    const rows = await listPublishedEntries();
    return rows.map(toView);
}
//# sourceMappingURL=changelog.service.js.map