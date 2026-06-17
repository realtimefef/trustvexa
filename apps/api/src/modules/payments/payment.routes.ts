/**
 * Payments / escrow feature router. Intended to be mounted at `/api/v1/deals`
 * (the parent wires it into the root router), so the paths below resolve to:
 *
 *   GET  /api/v1/deals/:id/escrow-address     — per-deal deposit address
 *   POST /api/v1/deals/:id/payment/submit-tx  — buyer submits a payment tx hash
 *   GET  /api/v1/deals/:id/payment/status     — payment status timeline
 *   POST /api/v1/deals/:id/refund-wallet       — buyer sets/updates refund wallet
 *
 * Reads are visible to any party of the deal (buyer/seller/middleman); the two
 * money/state routes are buyer-only (enforced in the service) and require an
 * Idempotency-Key, running through the `runMoneyWrite` contract. Per-deal
 * access is enforced in the service, returning a 404 for non-parties.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './payment.controller.js';
import {
  dealIdParamSchema,
  refundWalletBodySchema,
  submitTxBodySchema,
} from './payment.schemas.js';

export function paymentRouter(): Router {
  const router = Router();

  // GET /deals/:id/escrow-address — per-deal deposit address (parties only).
  router.get(
    '/:id/escrow-address',
    ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.getEscrowAddress),
  );

  // POST /deals/:id/payment/submit-tx — buyer submits a tx hash (+ screenshot
  // key). Money/state route: requires an Idempotency-Key and runs through the
  // money-write contract.
  router.post(
    '/:id/payment/submit-tx',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: submitTxBodySchema },
      roles: ['user'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.submitPaymentTx),
  );

  // GET /deals/:id/payment/status — payment status timeline (parties only).
  router.get(
    '/:id/payment/status',
    ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }),
    asyncHandler(controller.getPaymentStatus),
  );

  // POST /deals/:id/refund-wallet — buyer sets/updates the refund wallet.
  // Money/state route: requires an Idempotency-Key.
  router.post(
    '/:id/refund-wallet',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: refundWalletBodySchema },
      roles: ['user'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.setRefundWallet),
  );

  // POST /deals/:id/payout-wallet — seller sets/updates the payout wallet.
  router.post(
    '/:id/payout-wallet',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: refundWalletBodySchema },
      roles: ['user'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.setPayoutWallet),
  );

  // POST /deals/:id/payment-checklist-confirm — buyer confirms the before-you-pay checklist.
  // Money/state route: requires an Idempotency-Key.
  router.post(
    '/:id/payment-checklist-confirm',
    ...apiChain({
      schemas: { params: dealIdParamSchema },
      roles: ['user'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.confirmPaymentChecklist),
  );

  return router;
}
