/**
 * Disputes feature router (task 7.5), mounted at `/api/v1/disputes`. Read-only
 * view of a deal's dispute, available to either party or the assigned
 * middleman; access is enforced in the service. No Idempotency-Key is enforced
 * because there are no writes here.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import {
  disputeIdParamSchema,
  openDisputeSchema,
  postMessageSchema,
  registerEvidenceSchema,
  resolveDisputeSchema,
} from './dispute.schemas.js';
import * as controller from './dispute.controller.js';

const ACCOUNT_ROLES = ['user', 'middleman'] as const;

export function disputeRouter(): Router {
  const router = Router();

  // GET /api/v1/disputes/by-deal/:id — the dispute (if any) for a deal the
  // caller is a party to, with locked evidence metadata and thread states.
  router.get(
    '/by-deal/:id',
    ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }),
    asyncHandler(controller.getByDeal),
  );

  // POST /api/v1/disputes/by-deal/:id — a party (buyer/seller) opens a dispute
  // on a Funded/Delivered deal. State-changing: routes through the escrow state
  // machine (ProblemRaised -> Disputed) and requires an Idempotency-Key.
  router.post(
    '/by-deal/:id',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: openDisputeSchema },
      roles: [...ACCOUNT_ROLES],
      enforceIdempotency: true,
      rateLimit: { windowSeconds: 3600, max: 20 },
    }),
    asyncHandler(controller.open),
  );

  // POST /api/v1/disputes/by-deal/:id/resolve — middleman resolves the dispute
  // (full refund / full release / partial split). Money-moving: requires an
  // Idempotency-Key and runs under the money-write transaction contract.
  router.post(
    '/by-deal/:id/resolve',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: resolveDisputeSchema },
      roles: ['middleman'],
      enforceIdempotency: true,
      rateLimit: { windowSeconds: 60, max: 30 },
    }),
    asyncHandler(controller.resolve),
  );

  // GET /api/v1/disputes/:disputeId/messages — the dispute thread statements,
  // for a party to the deal or the assigned middleman.
  router.get(
    '/:disputeId/messages',
    ...apiChain({ schemas: { params: disputeIdParamSchema }, roles: [...ACCOUNT_ROLES] }),
    asyncHandler(controller.listMessages),
  );

  // POST /api/v1/disputes/:disputeId/messages — post a statement to the thread;
  // blocked once the thread is locked. Idempotent (Idempotency-Key).
  router.post(
    '/:disputeId/messages',
    ...apiChain({
      schemas: { params: disputeIdParamSchema, body: postMessageSchema },
      roles: [...ACCOUNT_ROLES],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.postMessage),
  );

  // POST /api/v1/disputes/:disputeId/evidence — register an evidence record
  // (file_key, file_hash, mime_type); locked at upload. Idempotent.
  router.post(
    '/:disputeId/evidence',
    ...apiChain({
      schemas: { params: disputeIdParamSchema, body: registerEvidenceSchema },
      roles: [...ACCOUNT_ROLES],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.registerEvidence),
  );

  return router;
}
