/**
 * Connections HTTP controllers. The caller is always taken from the verified
 * JWT; a non-participant gets the opaque 404 from the service.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './connections.service.js';

export async function createConnection(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = (req.body ?? {}) as { role?: string };
  const role = body.role === 'seller' ? 'seller' : 'buyer';
  const result = await service.createConnection(userId, role);
  res.status(201).json(result);
}

export async function joinConnection(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as { code: string };
  const result = await service.joinConnection(userId, body.code);
  res.status(200).json(result);
}

export async function listConnections(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.listConnections(userId);
  res.status(200).json(result);
}

export async function getConnection(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const result = await service.getConnection(userId, id);
  res.status(200).json(result);
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const channel = (req.query.channel as string | undefined) ?? undefined;
  const result = await service.listMessages(userId, id, channel);
  res.status(200).json(result);
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const body = req.body as { body: string; channel?: string };
  const result = await service.postMessage(userId, id, body.body, body.channel ?? 'buyer_seller');
  res.status(201).json(result);
}

/** POST /connections/contact-middleman — one-click middleman chat (no code needed). */
export async function contactMiddleman(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.contactMiddleman(userId);
  res.status(201).json(result);
}

/** DELETE /connections/:id — close (archive) a connection. */
export async function closeConnection(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  await service.closeConnection(userId, id);
  res.status(204).end();
}

/** POST /connections/:id/invite-middleman — bring a middleman into an existing buyer↔seller chat. */
export async function inviteMiddleman(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const result = await service.inviteMiddlemanToConnection(userId, id);
  res.status(200).json(result);
}

/** POST /connections/:id/claim-middleman — operator assigns THEMSELVES as the chat's middleman. */
export async function claimMiddlemanSelf(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const result = await service.assignSelfAsMiddleman(userId, id);
  res.status(200).json(result);
}

/** POST /connections/start-direct — operator opens a direct chat with any user by username/email/id. */
export async function startDirectChat(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as { identifier: string };
  const result = await service.startDirectChatWithUser(userId, body.identifier);
  res.status(201).json(result);
}

/** DELETE /connections/:id/messages/:msgId — soft-delete a single message (sender only). */
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const msgId = requireParam(req, 'msgId');
  await service.deleteMessage(userId, id, msgId);
  res.status(204).end();
}
