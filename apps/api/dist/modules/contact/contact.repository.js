/**
 * Data access for public contact submissions (task 8.3, Requirement 42.8).
 *
 * A single parameterized INSERT into `contact_messages`. The table stores the
 * email and body in `*_enc` columns sealed by `contact.service.ts` via
 * `sealPii()` before the repository is called.
 */
import { query } from '@trustvexa/shared';
export async function insertContactMessage(params) {
    const res = await query(`INSERT INTO contact_messages (name, email_enc, subject, body_enc, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, status, created_at`, [params.name, params.emailEnc, params.subject, params.bodyEnc, params.status]);
    return res.rows[0];
}
//# sourceMappingURL=contact.repository.js.map