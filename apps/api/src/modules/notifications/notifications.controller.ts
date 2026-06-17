/**
 * Notifications HTTP controllers. Each handler derives the acting user from the
 * verified JWT (via `requireUserId`) so a caller can only read or mutate their
 * own notifications, preferences, and push subscriptions — a user id is never
 * read from the request body or query. Validated input is shaped by the slot-5
 * Zod schemas in notifications.schemas.ts.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import type { NotificationChannel } from './notification-prefs.js';
import * as service from './notifications.service.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const q = req.query as { limit?: string; cursor?: string; archived?: 'true' | 'false' };
  const params: service.ListNotificationsParams = { includeArchived: q.archived === 'true' };
  if (q.limit !== undefined) params.limit = Number(q.limit);
  if (q.cursor !== undefined) params.cursor = q.cursor;
  const result = await service.listForUser(userId, params);
  res.status(200).json(result);
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const id = requireParam(req, 'id');
  const result = await service.markOneRead(userId, id);
  res.status(200).json(result);
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.markAllRead(userId);
  res.status(200).json(result);
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getPreferences(userId);
  res.status(200).json({ preferences: result });
}

export async function upsertPreference(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as { event_type: string; channel: NotificationChannel; enabled: boolean };
  const result = await service.upsertPreference(userId, {
    eventType: body.event_type,
    channel: body.channel,
    enabled: body.enabled,
  });
  res.status(200).json(result);
}

export async function subscribePush(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as {
    endpoint: string;
    p256dh_key: string;
    auth_key: string;
    device?: string | null;
  };
  const result = await service.subscribePush(userId, {
    endpoint: body.endpoint,
    p256dhKey: body.p256dh_key,
    authKey: body.auth_key,
    device: body.device ?? null,
  });
  res.status(201).json(result);
}
