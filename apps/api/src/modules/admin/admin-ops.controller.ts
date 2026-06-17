/**
 * HTTP controllers for the extended middleman/admin operations surface
 * (Plan §25/§33/§4): deal & user search, analytics, manual holds, overrides,
 * private notes, emergency pauses, and feature flags. Thin translation only —
 * the actor id comes from the verified JWT, the request id from the logging
 * middleware, and every audited write is performed in the service.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import type { PauseScope } from '../launch/emergency-pause.js';
import * as ops from './admin-ops.service.js';

function requestId(req: Request): string {
  return (req as unknown as { requestId?: string }).requestId ?? 'unknown';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// ── Search & analytics ─────────────────────────────────────────────────────

export async function searchDeals(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const q = req.query as { status?: string; risk?: string; q?: string };
  const filters: { status?: string; risk?: number; q?: string } = {};
  const status = optionalString(q.status);
  if (status !== undefined) filters.status = status;
  const search = optionalString(q.q);
  if (search !== undefined) filters.q = search;
  const risk = q.risk !== undefined ? Number(q.risk) : NaN;
  if (Number.isFinite(risk)) filters.risk = risk;
  res.status(200).json(await ops.searchDeals(filters));
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const q = req.query as { q?: string; status?: string; label?: string };
  const filters: { q?: string; status?: string; label?: string } = {};
  const search = optionalString(q.q);
  if (search !== undefined) filters.q = search;
  const status = optionalString(q.status);
  if (status !== undefined) filters.status = status;
  const label = optionalString(q.label);
  if (label !== undefined) filters.label = label;
  res.status(200).json(await ops.searchUsers(filters));
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await ops.getAnalytics());
}

// ── Holds ──────────────────────────────────────────────────────────────────

export async function listHolds(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await ops.listHolds());
}

export async function placeHold(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const body = req.body as { holdType: string; reason: string; visibleMessage?: string | null };
  res.status(201).json(
    await ops.placeHold({
      actorId,
      dealId,
      holdType: body.holdType,
      reason: body.reason,
      visibleMessage: body.visibleMessage ?? null,
      requestId: requestId(req),
    }),
  );
}

export async function releaseHold(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const holdId = requireParam(req, 'holdId');
  const body = req.body as { reason: string };
  res
    .status(200)
    .json(
      await ops.releaseHold({ actorId, holdId, reason: body.reason, requestId: requestId(req) }),
    );
}

// ── Overrides ────────────────────────────────────────────────────────────────

export async function listOverrides(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const dealId = optionalString((req.query as { dealId?: string }).dealId);
  res.status(200).json(await ops.listOverrides(dealId));
}

export async function recordOverride(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const dealId = requireParam(req, 'id');
  const body = req.body as {
    overrideType: string;
    oldValue: string;
    newValue: string;
    reason: string;
    confirmed: boolean;
  };
  res.status(201).json(
    await ops.recordOverride({
      actorId,
      dealId,
      overrideType: body.overrideType,
      oldValue: body.oldValue,
      newValue: body.newValue,
      reason: body.reason,
      confirmed: body.confirmed,
      requestId: requestId(req),
    }),
  );
}

// ── Notes ──────────────────────────────────────────────────────────────────

export async function listNotes(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const targetType = requireParam(req, 'targetType');
  const targetId = requireParam(req, 'targetId');
  res.status(200).json(await ops.listNotes(targetType, targetId));
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const targetType = requireParam(req, 'targetType');
  const targetId = requireParam(req, 'targetId');
  const body = req.body as { note: string };
  res.status(201).json(await ops.addNote({ actorId, targetType, targetId, note: body.note }));
}

// ── Emergency pauses ────────────────────────────────────────────────────────

export async function listPauses(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await ops.listPauses());
}

export async function startPause(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const body = req.body as { scope: PauseScope; reason: string };
  res.status(201).json(
    await ops.startPause({
      actorId,
      scope: body.scope,
      reason: body.reason,
      requestId: requestId(req),
    }),
  );
}

export async function endPause(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const pauseId = requireParam(req, 'pauseId');
  const body = (req.body ?? {}) as { reason?: string };
  res.status(200).json(
    await ops.endPause({
      actorId,
      pauseId,
      reason: body.reason ?? 'ended by middleman',
      requestId: requestId(req),
    }),
  );
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export async function listFeatureFlags(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await ops.listFeatureFlags());
}

export async function toggleFeatureFlag(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const key = requireParam(req, 'key');
  const body = req.body as { isEnabled: boolean; reason?: string };
  res.status(200).json(
    await ops.toggleFeatureFlag({
      actorId,
      key,
      isEnabled: body.isEnabled,
      reason: body.reason ?? 'toggled by middleman',
      requestId: requestId(req),
    }),
  );
}

export async function getAuditLog(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await ops.getAuditLog());
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const body = req.body as {
    title: string;
    body: string;
    audience: string;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  res.status(201).json(
    await ops.createAnnouncement({
      actorId,
      title: body.title,
      body: body.body,
      audience: body.audience,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      requestId: requestId(req),
    }),
  );
}

export async function searchChats(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  res.status(200).json(await ops.searchChats(limit));
}

export async function deleteChat(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const reqId = requestId(req);
  const chatId = requireParam(req, 'chatId');
  const body = req.body as { reason: string };
  if (!body.reason) {
    res.status(422).json({ error: 'A deletion reason is required.' });
    return;
  }
  res.status(200).json(
    await ops.deleteChat({
      actorId,
      chatId,
      reason: body.reason,
      requestId: reqId,
    }),
  );
}
