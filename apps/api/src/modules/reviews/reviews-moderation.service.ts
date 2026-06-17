/**
 * Middleman review moderation (Plan §9 "Moderated"; Requirement 25.4).
 *
 * The middleman can hide abusive or unsafe reviews and unhide them again.
 * Hidden reviews are excluded from the public read path (`is_hidden = false`),
 * so hiding a review immediately removes it from a user's public reputation.
 * Every moderation action requires a reason and writes a hash-chained
 * `admin_actions` audit row in the SAME transaction as the visibility change,
 * so it is accountable and tamper-evident — mirroring the enforcement service.
 */
import { getClient } from '@trustvexa/shared';

import { AppError, notFound } from '../../errors/app-error.js';
import {
  appendAdminAction,
  type TxClient as AdminTxClient,
} from '../admin/enforcement.repository.js';
import {
  getReviewById,
  listAllReviewsForUser,
  setReviewHidden,
  type ReviewRow,
  type TxClient,
} from './reviews.repository.js';

type PooledTx = TxClient & AdminTxClient & { release: () => void };

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface ModerationReviewView {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}

function toView(row: ReviewRow): ModerationReviewView {
  return {
    id: row.id,
    dealId: row.deal_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment,
    hidden: row.is_hidden,
    createdAt: toIso(row.created_at),
  };
}

/** List every review about a user (including hidden) for the moderation view. */
export async function listReviewsForModeration(
  revieweeId: string,
): Promise<{ revieweeId: string; reviews: ModerationReviewView[] }> {
  const client = (await getClient()) as unknown as PooledTx;
  try {
    const rows = await listAllReviewsForUser(client, revieweeId);
    return { revieweeId, reviews: rows.map(toView) };
  } finally {
    client.release();
  }
}

export interface ModerateReviewInput {
  actorId: string;
  reviewId: string;
  hidden: boolean;
  reason: string;
  requestId: string;
}

export interface ModerateReviewResult {
  reviewId: string;
  hidden: boolean;
  auditId: string;
}

/**
 * Hide or unhide a review as the middleman. Requires a reason. The visibility
 * change and its audit row commit together or not at all. Idempotent: setting
 * the same visibility again simply re-affirms it (and is still audited).
 */
export async function moderateReview(input: ModerateReviewInput): Promise<ModerateReviewResult> {
  const reason = input.reason?.trim();
  if (!reason) {
    throw new AppError('reason_required', 'A reason is required to moderate a review.', 422);
  }
  const client = (await getClient()) as unknown as PooledTx;
  try {
    await client.query('BEGIN');
    const review = await getReviewById(client, input.reviewId);
    if (review === null) {
      throw notFound('Review was not found.');
    }
    await setReviewHidden(client, input.reviewId, input.hidden);
    const auditId = await appendAdminAction(client, {
      actorId: input.actorId,
      action: input.hidden ? 'hide_review' : 'unhide_review',
      targetType: 'review',
      targetId: input.reviewId,
      reason,
      requestId: input.requestId,
      metadata: { revieweeId: review.reviewee_id, from: review.is_hidden, to: input.hidden },
    });
    await client.query('COMMIT');
    return { reviewId: input.reviewId, hidden: input.hidden, auditId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
