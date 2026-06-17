import type { Request, Response } from 'express';
import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './webhook.service.js';
import type { CreateWebhookInput } from './webhook.schemas.js';

export async function create(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const input = req.body as CreateWebhookInput;
  const result = await service.createWebhook(userId, input);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.listWebhooks(userId);
  res.status(200).json(result);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const webhookId = requireParam(req, 'id');
  await service.deleteWebhook(userId, webhookId);
  res.status(204).end();
}
