/**
 * Handover feature router (task 7.2), mounted at `/api/v1/handover`. Read-only
 * status view of a deal's handover items (never the secrets); access is
 * enforced in the service.
 */
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './handover.controller.js';

const handoverItemParamSchema = z.object({ itemId: z.string().uuid() });

const milestoneParamSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

const checklistBodySchema = z.object({
  checklistType: z.enum(['account_sale', 'digital_product']),
  itemKey: z.string().trim().min(1).max(100),
});

export function handoverRouter(): Router {
  const router = Router();

  // GET /api/v1/handover/deals/:id — handover item statuses for this deal.
  router.get(
    '/deals/:id',
    ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.getDealHandover),
  );

  // POST /api/v1/handover/items/:itemId/reveal — middleman reveals to the buyer.
  router.post(
    '/items/:itemId/reveal',
    ...apiChain({ schemas: { params: handoverItemParamSchema }, roles: ['middleman'] }),
    asyncHandler(controller.revealHandoverItem),
  );

  // POST /api/v1/handover/deals/:id/checklist — middleman marks a delivery
  // checklist item complete (gates milestone release). Idempotent.
  router.post(
    '/deals/:id/checklist',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: checklistBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.markChecklistItem),
  );

  // POST /api/v1/handover/deals/:id/milestones/:milestoneId/release —
  // middleman releases a milestone (partial payout). Money-moving: requires an
  // Idempotency-Key and runs under the money-write transaction contract.
  router.post(
    '/deals/:id/milestones/:milestoneId/release',
    ...apiChain({
      schemas: { params: milestoneParamSchema },
      roles: ['middleman'],
      enforceIdempotency: true,
      rateLimit: { windowSeconds: 60, max: 10 },
    }),
    asyncHandler(controller.releaseMilestone),
  );

  return router;
}
