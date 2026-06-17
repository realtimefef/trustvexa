/**
 * Read-side data access for reviews and trust (task 7.6). Public review reads
 * expose only the rating, comment, and timestamp (no reviewer identity beyond
 * the deal context), and hidden reviews are excluded. The missed-deadline count
 * feeds the pure trust-restriction engine. (Requirements 25.x, 26.x)
 */
import { query } from '@trustvexa/shared';
export async function listPublicReviews(revieweeId) {
    const res = await query(`SELECT id, deal_id, rating, comment, created_at
       FROM reviews
      WHERE reviewee_id = $1 AND is_hidden = false
      ORDER BY created_at DESC
      LIMIT 100`, [revieweeId]);
    return res.rows;
}
export async function countMissedDeadlines(userId) {
    const res = await query(`SELECT COUNT(*)::text AS n FROM trust_events
      WHERE user_id = $1 AND reason = 'missed_deadline'`, [userId]);
    return Number.parseInt(res.rows[0]?.n ?? '0', 10);
}
//# sourceMappingURL=reviews-read.repository.js.map