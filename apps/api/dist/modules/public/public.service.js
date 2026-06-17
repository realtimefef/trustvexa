/**
 * Public service (task 8.2). Exposes the current published version of each
 * legal/policy document for unauthenticated visitors. Content hashes are
 * included so a version badge can prove which text is live. (Requirements
 * 42.5, 42.6, 42.7, 47.5)
 */
import { listLatestVersions } from './policy-read.repository.js';
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function getPolicyVersions() {
    const rows = await listLatestVersions();
    return {
        versions: rows.map((r) => ({
            docType: r.doc_type,
            version: r.version,
            summary: r.summary,
            contentHash: r.content_hash,
            publishedAt: toIso(r.published_at),
        })),
    };
}
//# sourceMappingURL=public.service.js.map