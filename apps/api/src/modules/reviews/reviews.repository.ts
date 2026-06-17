// Persistence for deal reviews (task 7.6). Uniqueness (one review per
// deal+reviewer) is enforced by the DB constraint UNIQUE(deal_id, reviewer_id);
// callers handle the conflict. Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface ReviewRow {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
}

export interface InsertReviewInput {
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
}

export async function insertReview(tx: TxClient, input: InsertReviewInput): Promise<ReviewRow> {
  const { rows } = await tx.query<ReviewRow>(
    `INSERT INTO reviews (deal_id, reviewer_id, reviewee_id, rating, comment)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at`,
    [input.dealId, input.reviewerId, input.revieweeId, input.rating, input.comment],
  );
  const row = rows[0];
  if (!row) throw new Error('insertReview returned no row');
  return row;
}

export async function listReviewsForUser(tx: TxClient, revieweeId: string): Promise<ReviewRow[]> {
  const { rows } = await tx.query<ReviewRow>(
    `SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
		 FROM reviews
		 WHERE reviewee_id = $1 AND is_hidden = false
		 ORDER BY created_at DESC`,
    [revieweeId],
  );
  return rows;
}

export async function hasReviewed(
  tx: TxClient,
  dealId: string,
  reviewerId: string,
): Promise<boolean> {
  const { rowCount } = await tx.query(
    `SELECT 1 FROM reviews WHERE deal_id = $1 AND reviewer_id = $2`,
    [dealId, reviewerId],
  );
  return (rowCount ?? 0) > 0;
}

export async function setReviewHidden(
  tx: TxClient,
  reviewId: string,
  hidden: boolean,
): Promise<void> {
  await tx.query(`UPDATE reviews SET is_hidden = $2 WHERE id = $1`, [reviewId, hidden]);
}

/** Fetch a single review by id (any visibility) for moderation. */
export async function getReviewById(tx: TxClient, reviewId: string): Promise<ReviewRow | null> {
  const { rows } = await tx.query<ReviewRow>(
    `SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
       FROM reviews WHERE id = $1 LIMIT 1`,
    [reviewId],
  );
  return rows[0] ?? null;
}

/** List ALL reviews about a user (including hidden) for middleman moderation. */
export async function listAllReviewsForUser(
  tx: TxClient,
  revieweeId: string,
): Promise<ReviewRow[]> {
  const { rows } = await tx.query<ReviewRow>(
    `SELECT id, deal_id, reviewer_id, reviewee_id, rating, comment, is_hidden, created_at
       FROM reviews
      WHERE reviewee_id = $1
      ORDER BY created_at DESC
      LIMIT 200`,
    [revieweeId],
  );
  return rows;
}
