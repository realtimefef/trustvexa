/**
 * Payments / escrow HTTP controller.
 *
 * The caller id comes from the verified JWT (never the body); access against
 * the deal parties is enforced in the service. Money/state routes thread the
 * `Idempotency-Key` header into the service's `runMoneyWrite` contract.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './payment.service.js';
import type { RefundWalletInput, SubmitTxInput } from './payment.schemas.js';

/** GET /deals/:id/escrow-address — per-deal deposit address (parties only). */
export async function getEscrowAddress(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const result = await service.getEscrowAddressForUser(userId, dealId);
  res.status(200).json(result);
}

/** POST /deals/:id/payment/submit-tx — buyer submits a payment-proof tx hash. */
export async function submitPaymentTx(req: Request, res: Response): Promise<void> {
  const buyerId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const body = req.body as SubmitTxInput;
  const result = await service.submitPaymentTx({
    buyerId,
    dealId,
    txHash: body.txHash,
    screenshotFileKey: body.screenshotFileKey,
    idempotencyKey,
  });
  res.status(200).json(result);
}

/** GET /deals/:id/payment/status — payment status timeline (parties only). */
export async function getPaymentStatus(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const result = await service.getPaymentStatusForUser(userId, dealId);
  res.status(200).json(result);
}

/** POST /deals/:id/refund-wallet — buyer sets/updates the refund wallet. */
export async function setRefundWallet(req: Request, res: Response): Promise<void> {
  const buyerId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const body = req.body as RefundWalletInput;
  const result = await service.setRefundWallet({
    buyerId,
    dealId,
    address: body.address,
    idempotencyKey,
  });
  res.status(200).json(result);
}

/** POST /deals/:id/payout-wallet — seller sets/updates the payout wallet. */
export async function setPayoutWallet(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const body = req.body as RefundWalletInput;
  const result = await service.setPayoutWallet({
    sellerId,
    dealId,
    address: body.address,
    idempotencyKey,
  });
  res.status(200).json(result);
}

/** POST /deals/:id/payment-checklist-confirm — buyer confirms the before-you-pay checklist. */
export async function confirmPaymentChecklist(req: Request, res: Response): Promise<void> {
  const buyerId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const result = await service.confirmPaymentChecklist({
    buyerId,
    dealId,
    idempotencyKey,
  });
  res.status(200).json(result);
}
