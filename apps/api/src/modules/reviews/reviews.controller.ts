/**
 * Reviews + trust HTTP controllers (task 7.6). The public reviews read takes a
 * reviewee id from the validated path; the trust read derives the user from the
 * verified JWT so a caller can only see their own restriction status.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './reviews.service.js';
import * as moderation from './reviews-moderation.service.js';
import * as publicReviews from './public-reviews.service.js';

function requestId(req: Request): string {
  return (req as unknown as { requestId?: string }).requestId ?? 'unknown';
}

export async function getUserReviews(req: Request, res: Response): Promise<void> {
  const result = await service.getUserReviews(req.params.userId!);
  res.status(200).json(result);
}

export async function getMyTrust(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const result = await service.getTrustStatus(userId);
  res.status(200).json(result);
}

export async function submitReview(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const body = req.body as { rating: number; comment?: string | null };
  const trimmed = typeof body.comment === 'string' ? body.comment.trim() : '';
  const result = await service.submitReview(userId, req.params.id!, {
    rating: body.rating,
    comment: trimmed.length > 0 ? trimmed : null,
  });
  res.status(201).json(result);
}

/** Whether the caller already reviewed this deal (so the UI shows the right state). */
export async function getMyDealReviewStatus(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const result = await service.getMyDealReviewStatus(userId, req.params.id!);
  res.status(200).json(result);
}

/** Middleman: list every review about a user (including hidden) for moderation. */
export async function listReviewsForModeration(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const revieweeId = requireParam(req, 'userId');
  const result = await moderation.listReviewsForModeration(revieweeId);
  res.status(200).json(result);
}

/** Middleman: hide or unhide a review (audited, reason required). */
export async function moderateReview(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reviewId = requireParam(req, 'reviewId');
  const body = req.body as { hidden: boolean; reason: string };
  const result = await moderation.moderateReview({
    actorId,
    reviewId,
    hidden: body.hidden,
    reason: body.reason,
    requestId: requestId(req),
  });
  res.status(200).json(result);
}

// --- Site-wide public reviews ------------------------------------------------

/** Public: list visible public reviews + aggregate rating. */
export async function listPublicReviews(req: Request, res: Response): Promise<void> {
  const q = req.query as { limit?: string; offset?: string };
  const limit = Math.min(Math.max(Number.parseInt(q.limit ?? '100', 10) || 100, 1), 100);
  const offset = Math.max(Number.parseInt(q.offset ?? '0', 10) || 0, 0);
  const result = await publicReviews.listPublicReviews(limit, offset);
  res.status(200).json(result);
}

/** Any signed-in user: post a public review. */
export async function submitPublicReview(req: Request, res: Response): Promise<void> {
  const authorId = requireUserId(req);
  const body = req.body as { rating: number; title?: string | null; body: string };
  const result = await publicReviews.submitPublicReview(authorId, {
    rating: body.rating,
    title: body.title ?? null,
    body: body.body,
  });
  res.status(201).json(result);
}

/** Middleman: list all public reviews (incl. hidden + deleted) for moderation. */
export async function listPublicReviewsForModeration(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const result = await publicReviews.listPublicReviewsForModeration();
  res.status(200).json(result);
}

/** Middleman: edit a public review's content. */
export async function editPublicReview(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reviewId = requireParam(req, 'reviewId');
  const body = req.body as { rating: number; title?: string | null; body: string; reason: string };
  const result = await publicReviews.editPublicReview({
    actorId,
    reviewId,
    requestId: requestId(req),
    rating: body.rating,
    title: body.title ?? null,
    body: body.body,
    reason: body.reason,
  });
  res.status(200).json(result);
}

/** Middleman: post or clear a public reply to a review. */
export async function replyToPublicReview(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reviewId = requireParam(req, 'reviewId');
  const body = req.body as { reply: string | null };
  const result = await publicReviews.replyToPublicReview({
    actorId,
    reviewId,
    requestId: requestId(req),
    reply: body.reply ?? null,
  });
  res.status(200).json(result);
}

/** Middleman: hide/unhide a public review. */
export async function setPublicReviewVisibility(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reviewId = requireParam(req, 'reviewId');
  const body = req.body as { hidden: boolean; reason: string };
  const result = await publicReviews.setPublicReviewVisibility({
    actorId,
    reviewId,
    requestId: requestId(req),
    hidden: body.hidden,
    reason: body.reason,
  });
  res.status(200).json(result);
}

/** Middleman: soft-delete a public review. */
export async function deletePublicReview(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reviewId = requireParam(req, 'reviewId');
  const body = req.body as { reason: string };
  const result = await publicReviews.deletePublicReview({
    actorId,
    reviewId,
    requestId: requestId(req),
    reason: body.reason,
  });
  res.status(200).json(result);
}
