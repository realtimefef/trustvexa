/**
 * Invite HTTP controllers (task 4.3). The authenticated user id comes from the
 * verified JWT (`req.auth`), never the body. Create returns 201; accept,
 * preview, and list return 200; revoke returns 204.
 */
import type { Request, Response } from 'express';

import * as invites from './invite.service.js';
import type { CreateInviteInput, InviteTokenInput, RevokeInviteInput } from './invite.schemas.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const result = await invites.createInvite({
    sellerId,
    dealId: req.params.id!,
    input: req.body as CreateInviteInput,
  });
  res.status(201).json(result);
}

export async function listInvites(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const result = await invites.listInvites({ sellerId, dealId: req.params.id! });
  res.status(200).json({ invites: result });
}

export async function previewInvite(req: Request, res: Response): Promise<void> {
  const viewerId = requireUserId(req);
  const { token } = req.body as InviteTokenInput;
  const result = await invites.previewInvite({ viewerId, token });
  res.status(200).json(result);
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { token } = req.body as InviteTokenInput;
  const result = await invites.acceptInvite({ userId, token });
  res.status(200).json(result);
}

export async function revokeInvite(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const { reason } = req.body as RevokeInviteInput;
  await invites.revokeInvite({ sellerId, inviteId: req.params.id!, reason: reason ?? null });
  res.status(204).end();
}
