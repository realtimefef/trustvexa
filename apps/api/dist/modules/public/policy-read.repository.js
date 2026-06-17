/**
 * Read-side access for published policy versions (task 8.2). Returns the latest
 * published version per document type so public legal pages can display the
 * current version, summary, and content hash. (Requirements 42.5, 42.6, 42.7)
 */
import { query } from '@trustvexa/shared';
export async function listLatestVersions() {
    const res = await query(`SELECT DISTINCT ON (doc_type)
            doc_type, version, summary, content_hash, published_at
       FROM policy_versions
      ORDER BY doc_type, version DESC
      LIMIT 100`);
    return res.rows;
}
//# sourceMappingURL=policy-read.repository.js.map