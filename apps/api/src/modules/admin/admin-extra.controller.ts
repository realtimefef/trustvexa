/**
 * HTTP controllers for the extended operator Trust & Safety / Compliance
 * surface: legal holds, appeals, AML alerts, break-glass, and audited PII
 * access. Actor id comes from the verified JWT; the request id from logging
 * middleware; all writes are audited inside the service.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as svc from './admin-extra.service.js';

function requestId(req: Request): string {
  return (req as unknown as { requestId?: string }).requestId ?? 'unknown';
}
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// ── Legal holds ──────────────────────────────────────────────────────────────

export async function listLegalHolds(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await svc.listLegalHolds());
}

export async function placeLegalHold(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const body = req.body as { targetType: 'deal' | 'user'; targetId: string; reason: string };
  res.status(201).json(await svc.placeLegalHold({
    actorId, targetType: body.targetType, targetId: body.targetId, reason: body.reason, requestId: requestId(req),
  }));
}

export async function releaseLegalHold(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const holdId = requireParam(req, 'holdId');
  const body = req.body as { reason: string };
  res.status(200).json(await svc.releaseLegalHold({ actorId, holdId, reason: body.reason, requestId: requestId(req) }));
}

// ── Appeals ──────────────────────────────────────────────────────────────────

export async function listAppeals(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await svc.listAppeals(optionalString((req.query as { status?: string }).status)));
}

export async function decideAppeal(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const appealId = requireParam(req, 'appealId');
  const body = req.body as { decision: 'approved' | 'rejected'; decisionReason: string };
  res.status(200).json(await svc.decideAppeal({
    actorId, appealId, decision: body.decision, decisionReason: body.decisionReason, requestId: requestId(req),
  }));
}

// ── AML alerts ───────────────────────────────────────────────────────────────

export async function listAmlAlerts(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  const q = req.query as { status?: string; dealId?: string };
  const dealId = optionalString(q.dealId);
  if (dealId) {
    res.status(200).json(await svc.listAmlAlertsForDeal(dealId));
    return;
  }
  res.status(200).json(await svc.listAmlAlerts(optionalString(q.status)));
}

export async function updateAmlAlert(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const alertId = requireParam(req, 'alertId');
  const body = req.body as { status: string };
  res.status(200).json(await svc.updateAmlAlert({ actorId, alertId, status: body.status, requestId: requestId(req) }));
}

// ── Break-glass ──────────────────────────────────────────────────────────────

export async function listBreakGlass(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await svc.listBreakGlass());
}

export async function recordBreakGlass(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const body = req.body as { actorLabel: string; action: string; reason: string };
  res.status(201).json(await svc.recordBreakGlass({
    actorId, actorLabel: body.actorLabel, action: body.action, reason: body.reason, requestId: requestId(req),
  }));
}

// ── PII access ───────────────────────────────────────────────────────────────

export async function lookupUserPii(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const targetUserId = requireParam(req, 'userId');
  const body = req.body as { fields: string[]; reason: string };
  res.status(200).json(await svc.lookupUserPii({ actorId, targetUserId, fields: body.fields, reason: body.reason }));
}

export async function listPiiAccessLogs(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await svc.listPiiAccessLogs(optionalString((req.query as { userId?: string }).userId)));
}

// ── Withdrawal allowlist ─────────────────────────────────────────────────────

export async function listWithdrawalAllowlist(req: Request, res: Response): Promise<void> {
  requireUserId(req);
  res.status(200).json(await svc.listWithdrawalAllowlist());
}

export async function addWithdrawalAllowlist(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const body = req.body as { coin: string; network: string; address: string; label?: string | null; delayHours?: number };
  res.status(201).json(await svc.addWithdrawalAllowlist({
    actorId, coin: body.coin, network: body.network, address: body.address,
    label: body.label ?? null, delayHours: body.delayHours ?? 24, requestId: requestId(req),
  }));
}

export async function setWithdrawalAllowlistActive(req: Request, res: Response): Promise<void> {
  const actorId = requireUserId(req);
  const id = requireParam(req, 'id');
  const body = req.body as { isActive: boolean };
  res.status(200).json(await svc.setWithdrawalAllowlistActive({ actorId, id, isActive: body.isActive, requestId: requestId(req) }));
}
