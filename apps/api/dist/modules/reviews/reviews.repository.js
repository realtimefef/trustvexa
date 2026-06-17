// Persistence for deal reviews (task 7.6). Uniqueness (one review per
// deal+reviewer) is enforced by the DB constraint UNIQUE(deal_id, reviewer_id);
// callers handle the conflict. Not barrel-exported.
export async function insertReview(tx, input) {
    const { rows } = await tx.query(`INSERT INTO reviews (deal_id, reviewer_id, reviewee_id, rating, comment)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at`, [input.dealId, input.reviewerId, input.revieweeId, input.rating, input.comment]);
    const row = rows[0];
    if (!row)
        throw new Error('insertReview returned no row');
    return row;
}
export async function listReviewsForUser(tx, revieweeId) {
    const { rows } = await tx.query(`SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
		 FROM reviews
		 WHERE reviewee_id = $1 AND is_hidden = false
		 ORDER BY created_at DESC`, [revieweeId]);
    return rows;
}
export async function hasReviewed(tx, dealId, reviewerId) {
    const { rowCount } = await tx.query(`SELECT 1 FROM reviews WHERE deal_id = $1 AND reviewer_id = $2`, [dealId, reviewerId]);
    return (rowCount ?? 0) > 0;
}
export async function setReviewHidden(tx, reviewId, hidden) {
    await tx.query(`UPDATE reviews SET is_hidden = $2 WHERE id = $1`, [reviewId, hidden]);
}
/** Fetch a single review by id (any visibility) for moderation. */
export async function getReviewById(tx, reviewId) {
    const { rows } = await tx.query(`SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
       FROM reviews WHERE id = $1 LIMIT 1`, [reviewId]);
    return rows[0] ?? null;
}
/** List ALL reviews about a user (including hidden) for middleman moderation. */
export async function listAllReviewsForUser(tx, revieweeId) {
    const { rows } = await tx.query(`SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
       FROM reviews
      WHERE reviewee_id = $1
      ORDER BY created_at DESC
      LIMIT 200`, [revieweeId]);
    return rows;
}
//# sourceMappingURL=reviews.repository.js.map