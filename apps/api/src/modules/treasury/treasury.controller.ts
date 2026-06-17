/**
 * Treasury panel HTTP controller (task 7.4). Read-only; the route chain
 * restricts it to the `middleman` role, so only operators can view balances.
 */
import type { Request, Response } from 'express';

import * as service from './treasury.service.js';

export async function getTreasury(_req: Request, res: Response): Promise<void> {
  const result = await service.getTreasury();
  res.status(200).json(result);
}
