/**
 * Handover HTTP controller (task 7.2). Read-only; the caller id comes from the
 * verified JWT and access is enforced in the service against the deal parties.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './handover.service.js';
import * as milestoneService from './milestone.service.js';

export async function getDealHandover(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const result = await service.getHandoverForUser(userId, req.params.id!);
  res.status(200).json(result);
}

export async function revealHandoverItem(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const result = await service.revealHandoverItem(userId, req.params.itemId!);
  res.status(200).json(result);
}

/**
 * Release one milestone (middleman-only, money-moving). Idempotency is enforced
 * by the route chain; the Idempotency-Key header is threaded into the
 * money-write contract.
 */
export async function releaseMilestone(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const milestoneId = requireParam(req, 'milestoneId');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const result = await milestoneService.releaseMilestone({
    middlemanId,
    dealId,
    milestoneId,
    idempotencyKey,
  });
  res.status(200).json(result);
}

/** Mark a delivery-checklist item complete (middleman-only). */
export async function markChecklistItem(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const idempotencyKey = req.header('Idempotency-Key') ?? '';
  const body = req.body as { checklistType: 'account_sale' | 'digital_product'; itemKey: string };
  const result = await milestoneService.markChecklistItem({
    middlemanId,
    dealId,
    checklistType: body.checklistType,
    itemKey: body.itemKey,
    idempotencyKey,
  });
  res.status(200).json(result);
}
