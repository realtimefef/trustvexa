/**
 * HTTP controllers for account deactivation / reactivation / deletion (task 3.10).
 */
import type { Request, Response } from 'express';

import * as account from './account.service.js';
import type { AccountActionInput } from './auth.schemas.js';

export async function deactivate(req: Request, res: Response): Promise<void> {
  const body = req.body as AccountActionInput;
  await account.deactivate(req.auth!.userId!, body.password, body.reason ?? null);
  res.status(200).json({ ok: true, account_status: 'deactivated' });
}

export async function reactivate(req: Request, res: Response): Promise<void> {
  await account.reactivate(req.auth!.userId!);
  res.status(200).json({ ok: true, account_status: 'active' });
}

export async function requestDeletion(req: Request, res: Response): Promise<void> {
  const body = req.body as AccountActionInput;
  const result = await account.requestDeletion(
    req.auth!.userId!,
    body.password,
    body.reason ?? null,
  );
  res.status(result.status === 'completed' ? 200 : 202).json({
    ok: true,
    status: result.status,
    active_deal_count: result.activeDealCount,
  });
}
