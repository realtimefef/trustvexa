/**
 * Feedback HTTP controller. (Audit FIX-P3-5 — extracted from feedback.routes.ts)
 */
import type { Request, Response } from 'express';
import { requireUserId } from '../../lib/http-params.js';
import * as service from './feedback.service.js';
import type { SubmitFeedbackInput } from './feedback.service.js';

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as SubmitFeedbackInput;
  const feedback = await service.submitFeedback(userId, body);
  res.status(201).json({ feedback });
}
