/**
 * HTTP controllers for recovery, verification, credential-change and step-up
 * endpoints (tasks 3.6, 3.7). Validation runs in slot 5; authenticated routes
 * always carry `req.auth` after slots 6–7.
 */
import type { Request, Response } from 'express';

import * as recovery from './recovery.service.js';
import * as stepUp from './step-up.js';
import type {
  ChangeEmailInput,
  ChangePasswordInput,
  ConfirmStepUpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SetRecoveryEmailInput,
  StepUpInput,
  VerifyEmailInput,
} from './auth.schemas.js';

export async function requestEmailVerification(req: Request, res: Response): Promise<void> {
  if (req.auth?.userId) {
    await recovery.requestEmailVerification(req.auth.userId);
  }
  res.status(202).json({ ok: true });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  await recovery.verifyEmail((req.body as VerifyEmailInput).token);
  res.status(200).json({ ok: true });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await recovery.forgotPassword(req.body as ForgotPasswordInput);
  res.status(202).json({ ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await recovery.resetPassword(req.body as ResetPasswordInput);
  res.status(200).json({ ok: true });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  await recovery.changePassword(req.auth!.userId!, req.body as ChangePasswordInput);
  res.status(200).json({ ok: true });
}

export async function changeEmail(req: Request, res: Response): Promise<void> {
  await recovery.changeEmail(req.auth!.userId!, req.body as ChangeEmailInput);
  res.status(202).json({ ok: true });
}

export async function setRecoveryEmail(req: Request, res: Response): Promise<void> {
  await recovery.setRecoveryEmail(req.auth!.userId!, req.body as SetRecoveryEmailInput);
  res.status(200).json({ ok: true });
}

export async function requestStepUp(req: Request, res: Response): Promise<void> {
  const { actionType, dealId } = req.body as StepUpInput;
  const challenge = await stepUp.createStepUpChallenge(
    req.auth!.userId!,
    actionType,
    dealId ?? null,
  );
  // The token is delivered out-of-band; only metadata is returned to the caller.
  res.status(201).json({ step_up_id: challenge.id, expires_at: challenge.expiresAt.toISOString() });
}

export async function confirmStepUp(req: Request, res: Response): Promise<void> {
  const { token, actionType } = req.body as ConfirmStepUpInput;
  const confirmed = await stepUp.confirmStepUp(req.auth!.userId!, actionType, token);
  res.status(confirmed ? 200 : 400).json({ confirmed });
}

export async function acceptPolicy(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing.');
  }
  const { docType, version } = req.body as { docType: 'terms' | 'privacy'; version: string };
  await recovery.acceptPolicy(userId, { docType, version });
  res.status(200).json({ ok: true });
}
