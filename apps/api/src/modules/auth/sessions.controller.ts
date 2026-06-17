/**
 * HTTP controllers for session/device management + security log (task 3.8).
 */
import type { Request, Response } from 'express';

import * as sessions from './sessions.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const data = await sessions.listSessions(req.auth!.userId!, req.auth?.sessionId ?? null);
  res.status(200).json({ sessions: data });
}

export async function revoke(req: Request, res: Response): Promise<void> {
  await sessions.revokeSession(req.auth!.userId!, req.params.id!);
  res.status(204).end();
}

export async function securityLog(req: Request, res: Response): Promise<void> {
  const data = await sessions.listSecurityEvents(req.auth!.userId!);
  res.status(200).json({ events: data });
}
