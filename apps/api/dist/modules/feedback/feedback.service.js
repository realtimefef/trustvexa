/**
 * Feedback service. (Audit FIX-P3-5 — extracted from feedback.routes.ts)
 */
import { query } from '@trustvexa/shared';
export async function submitFeedback(userId, input) {
    const result = await query(`INSERT INTO platform_feedback (user_id, score, comment_enc)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, score, comment_enc, created_at`, [userId, input.rating, input.message ?? null]);
    const row = result.rows[0];
    if (!row) {
        throw new Error('Failed to insert feedback row');
    }
    return row;
}
//# sourceMappingURL=feedback.service.js.map