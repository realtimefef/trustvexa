// Post-deal reviews + rating-to-trust aggregation (task 7.6). Pure validation
// and projection helpers; persistence/uniqueness live in the repository + DB
// constraint (unique per deal_id + reviewer_id). Public reviews expose the
// reviewer's username only, never user ids.
// (Requirements 25.1-25.5)

import type { DealStatus } from '../deal/state-machine.js';

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_REVIEW_COMMENT_CHARS = 1000;

export type ReviewValidationError =
  | 'rating_out_of_range'
  | 'rating_not_integer'
  | 'comment_too_long';

export interface ReviewInput {
  rating: number;
  comment?: string | null;
}

export interface ReviewValidationResult {
  ok: boolean;
  error?: ReviewValidationError;
}

export function validateReview(input: ReviewInput): ReviewValidationResult {
  if (!Number.isInteger(input.rating)) return { ok: false, error: 'rating_not_integer' };
  if (input.rating < MIN_RATING || input.rating > MAX_RATING) {
    return { ok: false, error: 'rating_out_of_range' };
  }
  if ((input.comment?.length ?? 0) > MAX_REVIEW_COMMENT_CHARS) {
    return { ok: false, error: 'comment_too_long' };
  }
  return { ok: true };
}

/** Deal statuses after which a counterparty review may be left. */
const REVIEWABLE_STATUSES: ReadonlySet<DealStatus> = new Set<DealStatus>([
  'Released',
  'MilestoneReleased',
  'Refunded',
  'PartiallySettled',
]);

export interface ReviewEligibility {
  dealStatus: DealStatus;
  isParty: boolean;
  alreadyReviewed: boolean;
}

export function canSubmitReview(e: ReviewEligibility): boolean {
  return e.isParty && !e.alreadyReviewed && REVIEWABLE_STATUSES.has(e.dealStatus);
}

export interface ReviewRecord {
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  reviewerUsername: string;
}

export interface PublicReview {
  rating: number;
  comment: string | null;
  reviewerUsername: string;
}

/** Project a review for public display; hidden reviews return null. */
export function projectPublicReview(review: ReviewRecord): PublicReview | null {
  if (review.isHidden) return null;
  return {
    rating: review.rating,
    comment: review.comment,
    reviewerUsername: review.reviewerUsername,
  };
}

export interface RatingSummary {
  average: number;
  count: number;
}

/** Average rating over visible reviews only; feeds the trust display. */
export function aggregateRating(
  reviews: ReadonlyArray<{ rating: number; isHidden: boolean }>,
): RatingSummary {
  const visible = reviews.filter((r) => !r.isHidden);
  if (visible.length === 0) return { average: 0, count: 0 };
  const total = visible.reduce((sum, r) => sum + r.rating, 0);
  return { average: total / visible.length, count: visible.length };
}
