/**
 * Reviews + trust feature router (task 7.6), mounted at `/api/v1/reviews`.
 *
 * - GET /users/:userId is public (rating + comment, no private identity) so a
 *   counterparty's reputation can be shown before a deal.
 * - GET /me/trust is restricted to signed-in accounts and returns only the
 *   caller's own trust restriction.
 */
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './reviews.controller.js';

const userIdParamSchema = z.object({ userId: z.string().uuid() });
const reviewIdParamSchema = z.object({ reviewId: z.string().uuid() });
const moderateReviewSchema = z.object({
  hidden: z.boolean(),
  reason: z.string().trim().min(1).max(2000),
});
const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullish(),
});

// --- Site-wide public reviews ---
const publicReviewListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
const submitPublicReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).nullish(),
  body: z.string().trim().min(1).max(2000),
});
const editPublicReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).nullish(),
  body: z.string().trim().min(1).max(2000),
  reason: z.string().trim().min(1).max(2000),
});
const replyPublicReviewSchema = z.object({
  reply: z.string().trim().max(2000).nullable(),
});
const hidePublicReviewSchema = z.object({
  hidden: z.boolean(),
  reason: z.string().trim().min(1).max(2000),
});
const deletePublicReviewSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export function reviewsRouter(): Router {
  const router = Router();

  router.get(
    '/users/:userId',
    ...apiChain({ schemas: { params: userIdParamSchema } }),
    asyncHandler(controller.getUserReviews),
  );

  router.get(
    '/me/trust',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.getMyTrust),
  );

  // --- Middleman moderation (Plan §9, Requirement 25.4) ------------------
  // List every review about a user, including hidden ones, for triage.
  router.get(
    '/moderation/users/:userId',
    ...apiChain({ schemas: { params: userIdParamSchema }, roles: ['middleman'] }),
    asyncHandler(controller.listReviewsForModeration),
  );
  // Hide / unhide a review (audited, reason required, idempotent).
  router.post(
    '/moderation/:reviewId',
    ...apiChain({
      schemas: { params: reviewIdParamSchema, body: moderateReviewSchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.moderateReview),
  );

  // Submit a review of the counterparty on a completed deal. The deal id is in
  // the path; eligibility (party, terminal status, one-per-deal) is enforced in
  // the service. Restricted to signed-in accounts.
  router.post(
    '/deals/:id',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: submitReviewSchema },
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.submitReview),
  );

  // --- Site-wide public reviews ------------------------------------------
  // Public board: anyone can read; any signed-in user can post.
  router.get(
    '/public',
    ...apiChain({ schemas: { query: publicReviewListQuerySchema } }),
    asyncHandler(controller.listPublicReviews),
  );
  router.post(
    '/public',
    ...apiChain({
      schemas: { body: submitPublicReviewSchema },
      roles: ['user', 'middleman'],
      rateLimit: { windowSeconds: 3600, max: 5 },
    }),
    asyncHandler(controller.submitPublicReview),
  );

  // Middleman moderation of public reviews: list-all / edit / reply / hide / delete.
  router.get(
    '/public/moderation',
    ...apiChain({ roles: ['middleman'] }),
    asyncHandler(controller.listPublicReviewsForModeration),
  );
  router.patch(
    '/public/:reviewId',
    ...apiChain({
      schemas: { params: reviewIdParamSchema, body: editPublicReviewSchema },
      roles: ['middleman'],
    }),
    asyncHandler(controller.editPublicReview),
  );
  router.post(
    '/public/:reviewId/reply',
    ...apiChain({
      schemas: { params: reviewIdParamSchema, body: replyPublicReviewSchema },
      roles: ['middleman'],
    }),
    asyncHandler(controller.replyToPublicReview),
  );
  router.post(
    '/public/:reviewId/visibility',
    ...apiChain({
      schemas: { params: reviewIdParamSchema, body: hidePublicReviewSchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.setPublicReviewVisibility),
  );
  router.delete(
    '/public/:reviewId',
    ...apiChain({
      schemas: { params: reviewIdParamSchema, body: deletePublicReviewSchema },
      roles: ['middleman'],
    }),
    asyncHandler(controller.deletePublicReview),
  );

  return router;
}
