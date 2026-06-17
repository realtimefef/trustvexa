/**
 * Persistence for site-wide public reviews.
 *
 * The public read path excludes hidden and soft-deleted rows. Moderation reads
 * (middleman) see everything. All writes are parameterized.
 */
import { query } from '@trustvexa/shared';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface PublicReviewRow {
  id: string;
  author_id: string;
  rating: number;
  title: string | null;
  body: string;
  is_hidden: boolean;
  deleted_at: Date | string | null;
  reply_body: string | null;
  replied_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  /** Joined from users for display. */
  author_username?: string | null;
}

export interface InsertPublicReviewInput {
  authorId: string;
  rating: number;
  title: string | null;
  body: string;
}

export async function insertPublicReview(input: InsertPublicReviewInput): Promise<PublicReviewRow> {
  const res = await query<PublicReviewRow>(
    `INSERT INTO public_reviews (author_id, rating, title, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, author_id, rating, title, body, is_hidden, deleted_at,
               reply_body, replied_at, created_at, updated_at`,
    [input.authorId, input.rating, input.title, input.body],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertPublicReview returned no row');
  return row;
}

/** Public, visible reviews (newest first) with the author's username joined. */
export async function listVisiblePublicReviews(limit = 100, offset = 0): Promise<PublicReviewRow[]> {
  const res = await query<PublicReviewRow>(
    `SELECT pr.id, pr.author_id, pr.rating, pr.title, pr.body, pr.is_hidden, pr.deleted_at,
            pr.reply_body, pr.replied_at, pr.created_at, pr.updated_at,
            u.username AS author_username
       FROM public_reviews pr
       JOIN users u ON u.id = pr.author_id
      WHERE pr.is_hidden = false AND pr.deleted_at IS NULL
      ORDER BY pr.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return res.rows;
}

/** Every review (incl. hidden + soft-deleted) for the middleman moderation view. */
export async function listAllPublicReviews(limit = 200, offset = 0): Promise<PublicReviewRow[]> {
  const res = await query<PublicReviewRow>(
    `SELECT pr.id, pr.author_id, pr.rating, pr.title, pr.body, pr.is_hidden, pr.deleted_at,
            pr.reply_body, pr.replied_at, pr.created_at, pr.updated_at,
            u.username AS author_username
       FROM public_reviews pr
       JOIN users u ON u.id = pr.author_id
      ORDER BY pr.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return res.rows;
}

export async function getPublicReviewById(
  tx: TxClient,
  reviewId: string,
): Promise<PublicReviewRow | null> {
  const { rows } = await tx.query<PublicReviewRow>(
    `SELECT id, author_id, rating, title, body, is_hidden, deleted_at,
            reply_body, replied_at, created_at, updated_at
       FROM public_reviews WHERE id = $1 LIMIT 1`,
    [reviewId],
  );
  return rows[0] ?? null;
}

/** Count recent reviews by an author within a window (anti-spam). */
export async function countRecentByAuthor(authorId: string, windowSeconds: number): Promise<number> {
  const res = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM public_reviews
      WHERE author_id = $1 AND created_at > now() - ($2 || ' seconds')::interval`,
    [authorId, String(windowSeconds)],
  );
  return Number.parseInt(res.rows[0]?.n ?? '0', 10);
}

/** Middleman edit of the review text/rating. */
export async function updatePublicReviewContent(
  tx: TxClient,
  reviewId: string,
  editorId: string,
  fields: { rating: number; title: string | null; body: string },
): Promise<void> {
  await tx.query(
    `UPDATE public_reviews
        SET rating = $2, title = $3, body = $4,
            edited_by = $5, edited_at = now(), updated_at = now()
      WHERE id = $1`,
    [reviewId, fields.rating, fields.title, fields.body, editorId],
  );
}

/** Middleman public reply (or clearing it with null). */
export async function setPublicReviewReply(
  tx: TxClient,
  reviewId: string,
  replierId: string,
  replyBody: string | null,
): Promise<void> {
  await tx.query(
    `UPDATE public_reviews
        SET reply_body = $2,
            replied_by = CASE WHEN $2 IS NULL THEN NULL ELSE $3 END,
            replied_at = CASE WHEN $2 IS NULL THEN NULL ELSE now() END,
            updated_at = now()
      WHERE id = $1`,
    [reviewId, replyBody, replierId],
  );
}

export async function setPublicReviewHidden(
  tx: TxClient,
  reviewId: string,
  hidden: boolean,
): Promise<void> {
  await tx.query(`UPDATE public_reviews SET is_hidden = $2, updated_at = now() WHERE id = $1`, [
    reviewId,
    hidden,
  ]);
}

/** Soft-delete (set deleted_at/by) or restore (null) a review. */
export async function setPublicReviewDeleted(
  tx: TxClient,
  reviewId: string,
  deleterId: string,
  deleted: boolean,
): Promise<void> {
  await tx.query(
    `UPDATE public_reviews
        SET deleted_at = CASE WHEN $2 THEN now() ELSE NULL END,
            deleted_by = CASE WHEN $2 THEN $3 ELSE NULL END,
            updated_at = now()
      WHERE id = $1`,
    [reviewId, deleted, deleterId],
  );
}
