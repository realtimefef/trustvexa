/**
 * Party details router — seller/buyer information for a deal.
 *
 * Mounted under /deals/:id/ so every route has the deal id in params.
 * Routes:
 *   POST /deals/:id/seller-details    — seller submits product/delivery info
 *   POST /deals/:id/buyer-details     — buyer submits receiving/contact info
 *   GET  /deals/:id/party-details     — role-scoped view (see service)
 *   POST /deals/:id/party-details/verify — middleman marks a side as verified
 */
import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as service from './party-details.service.js';

// ── Validation schemas ────────────────────────────────────────────────────────

const dealIdParamSchema = z.object({ id: z.string().uuid() });

const sellerDetailsBodySchema = z.object({
  productName: z.string().max(500).optional().nullable(),
  productDescription: z.string().max(10_000).optional().nullable(),
  requirements: z.string().max(10_000).optional().nullable(),
  deliveryMethod: z.string().max(100).optional().nullable(),
  deliveryInstructions: z.string().max(10_000).optional().nullable(),
  estimatedDeliveryTime: z.string().max(500).optional().nullable(),
  additionalNotes: z.string().max(5_000).optional().nullable(),
});

const buyerDetailsBodySchema = z.object({
  receivingPlatform: z.string().max(100).optional().nullable(),
  receivingAddress: z.string().max(2_000).optional().nullable(),
  contactEmail: z.string().max(500).optional().nullable(),
  backupContact: z.string().max(1_000).optional().nullable(),
  specialInstructions: z.string().max(5_000).optional().nullable(),
  suggestions: z.string().max(5_000).optional().nullable(),
});

const verifyBodySchema = z.object({
  role: z.enum(['seller', 'buyer']),
});

// ── Controller helpers ────────────────────────────────────────────────────────

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function postSellerDetails(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const input = req.body as service.SubmitSellerDetailsInput;
  const result = await service.submitSellerDetails(userId, dealId, input);
  res.status(200).json(result);
}

async function postBuyerDetails(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const input = req.body as service.SubmitBuyerDetailsInput;
  const result = await service.submitBuyerDetails(userId, dealId, input);
  res.status(200).json(result);
}

async function getPartyDetails(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.getPartyDetails(userId, dealId);
  res.status(200).json(result);
}

async function postVerifyPartyDetails(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const { role } = req.body as { role: 'seller' | 'buyer' };
  const result = await service.verifyPartyDetails(userId, dealId, role);
  res.status(200).json(result);
}

// ── Router factory ────────────────────────────────────────────────────────────

const ACCOUNT_ROLES = ['user', 'middleman'] as const;

export function partyDetailsRouter(): Router {
  const router = Router({ mergeParams: true });

  // POST /deals/:id/seller-details
  router.post(
    '/:id/seller-details',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: sellerDetailsBodySchema },
      roles: [...ACCOUNT_ROLES],
    }),
    asyncHandler(postSellerDetails),
  );

  // POST /deals/:id/buyer-details
  router.post(
    '/:id/buyer-details',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: buyerDetailsBodySchema },
      roles: [...ACCOUNT_ROLES],
    }),
    asyncHandler(postBuyerDetails),
  );

  // GET /deals/:id/party-details
  router.get(
    '/:id/party-details',
    ...apiChain({
      schemas: { params: dealIdParamSchema },
      roles: [...ACCOUNT_ROLES],
    }),
    asyncHandler(getPartyDetails),
  );

  // POST /deals/:id/party-details/verify  (middleman only)
  router.post(
    '/:id/party-details/verify',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: verifyBodySchema },
      roles: ['middleman'],
    }),
    asyncHandler(postVerifyPartyDetails),
  );

  return router;
}
