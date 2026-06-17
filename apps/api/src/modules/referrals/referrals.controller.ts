/**
 * Referral program HTTP controllers (Build Spec §3 "Support / misc").
 *
 * The owner is always derived from the verified JWT (`requireUserId`), never
 * from request input. Creating the code is idempotent get-or-create.
 */
import type { Request, Response } from 'express';

import { requireUserId } from '../../lib/http-params.js';
import * as service from './referrals.service.js';

export async function listReferrals(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.listReferrals(userId);
  res.status(200).json(result);
}

export async function createCode(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getOrCreateCode(userId);
  res.status(201).json(result);
}
