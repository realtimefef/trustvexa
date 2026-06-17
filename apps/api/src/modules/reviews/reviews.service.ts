/**
 * Reviews + trust read service (task 7.6). Aggregates a user's public reviews
 * into a rating summary, and resolves the caller's current trust restriction
 * from their missed-deadline count using the pure restriction engine.
 * (Requirements 25.x, 26.1-26.10)
 */
import { getClient } from '@trustvexa/shared';

import { AppError, notFound } from '../../errors/app-error.js';
import type { DealStatus } from '../deal/state-machine.js';
import { getDealForUser } from '../dashboard/deal-read.repository.js';
import { restrictionFor, type TrustRestriction } from './trust-restrictions.js';
import { countMissedDeadlines, listPublicReviews } from './reviews-read.repository.js';
import { hasReviewed, insertReview, type TxClient } from './reviews.repository.js';

export interface PublicReview {
  id: string;
  dealId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface UserReviews {
  revieweeId: string;
  count: number;
  averageRating: number;
  reviews: PublicReview[];
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function getUserReviews(revieweeId: string): Promise<UserReviews> {
  const rows = await listPublicReviews(revieweeId);
  const count = rows.length;
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
  return {
    revieweeId,
    count,
    averageRating,
    reviews: rows.map((r) => ({
      id: r.id,
      dealId: r.deal_id,
      rating: r.rating,
      comment: r.comment,
      createdAt: toIso(r.created_at),
    })),
  };
}

export interface TrustStatus {
  missedDeadlineCount: number;
  restriction: TrustRestriction;
}

export async function getTrustStatus(userId: string): Promise<TrustStatus> {
  const missedDeadlineCount = await countMissedDeadlines(userId);
  return { missedDeadlineCount, restriction: restrictionFor({ missedDeadlineCount }) };
}

/**
 * Deals that are complete enough to be reviewed. A review captures how the
 * counterparty behaved across a finished deal, so only the terminal
 * settlement states qualify (not in-flight, cancelled-before-funding, or
 * expired drafts).
 */
const REVIEWABLE_STATUSES: ReadonlySet<DealStatus> = new Set<DealStatus>([
  'Released',
  'Refunded',
  'PartiallySettled',
]);

export interface SubmitReviewInput {
  rating: number;
  comment: string | null;
}

export interface SubmitReviewResult {
  id: string;
  dealId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/** A pooled client used transactionally (pg.PoolClient satisfies this). */
type PooledTx = TxClient & { release: () => void };

/**
 * Submit a review of the counterparty on a completed deal. Eligibility is
 * enforced entirely server-side: the caller must be a party to the deal, the
 * deal must be a real (non-practice) deal in a terminal settlement state, and
 * only the buyer or seller may review (the reviewee is resolved as the other
 * party — the middleman is never reviewed here). The one-review-per-deal rule
 * is guaranteed by the UNIQUE(deal_id, reviewer_id) constraint plus a
 * pre-check inside the same transaction. (Requirements 25.x, 26.1-26.10)
 */
export async function submitReview(
  userId: string,
  dealId: string,
  input: SubmitReviewInput,
): Promise<SubmitReviewResult> {
  const deal = await getDealForUser(dealId, userId);
  if (!deal) {
    throw notFound('Deal not found.');
  }
  if (deal.is_practice) {
    throw new AppError('review_not_allowed', 'Practice deals cannot be reviewed.', 409);
  }
  if (!REVIEWABLE_STATUSES.has(deal.status)) {
    throw new AppError(
      'review_not_allowed',
      'This deal is not in a completed state, so it cannot be reviewed yet.',
      409,
    );
  }

  let revieweeId: string | null;
  if (deal.buyer_id === userId) {
    revieweeId = deal.seller_id;
  } else if (deal.seller_id === userId) {
    revieweeId = deal.buyer_id;
  } else {
    throw new AppError('review_not_allowed', 'Only the buyer or seller can leave a review.', 403);
  }
  if (!revieweeId) {
    throw new AppError('review_not_allowed', 'This deal has no counterparty to review.', 409);
  }

  const client = (await getClient()) as unknown as PooledTx;
  try {
    await client.query('BEGIN');
    if (await hasReviewed(client, dealId, userId)) {
      throw new AppError('already_reviewed', 'You have already reviewed this deal.', 409);
    }
    const row = await insertReview(client, {
      dealId,
      reviewerId: userId,
      revieweeId,
      rating: input.rating,
      comment: input.comment,
    });
    await client.query('COMMIT');
    return {
      id: row.id,
      dealId: row.deal_id,
      revieweeId: row.reviewee_id,
      rating: row.rating,
      comment: row.comment,
      createdAt: toIso(row.created_at),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
