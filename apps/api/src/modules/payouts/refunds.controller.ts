/**
 * Refunds HTTP controller (operator). The acting middleman id comes from the
 * verified JWT; the assigned-middleman authorization is enforced in the service.
 * The body is validated by `processRefundSchema` and the Idempotency-Key header
 * is threaded into the money-write.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import type { ProcessRefundBody } from './payouts.schemas.js';
import * as service from './refund.service.js';

/** POST /api/v1/refunds/by-deal/:id/process — process a deal refund. */
export async function process(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const body = req.body as ProcessRefundBody;
  const result = await service.processRefundForDeal({
    middlemanId,
    dealId,
    idempotencyKey,
    cause: body.cause,
    reason: body.reason,
    ...(body.gasCostSmallestUnit !== undefined
      ? { gasCostSmallestUnit: body.gasCostSmallestUnit }
      : {}),
  });
  res.status(200).json(result);
}
