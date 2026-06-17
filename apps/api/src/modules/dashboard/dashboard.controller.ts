/**
 * Dashboard HTTP controllers (task 7.1).
 *
 * Thin translation between HTTP and the dashboard service. The authenticated
 * user id always comes from the verified JWT (`req.auth`), never from the
 * request, so a client cannot read another user's deals. Both routes are
 * read-only and return 200.
 */
import type { Request, Response } from 'express';

import * as service from './dashboard.service.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    // The role guard (slot 7) should already have rejected anonymous access;
    // this is a defensive belt-and-suspenders check.
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getDashboard(userId);
  res.status(200).json(result);
}

export async function getDealDetail(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getDealDetail(userId, req.params.id!);
  res.status(200).json(result);
}
