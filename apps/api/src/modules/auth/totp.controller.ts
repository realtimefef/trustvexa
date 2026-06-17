import type { Request, Response } from 'express';
import * as totpService from './totp.service.js';
import * as authService from './auth.service.js';
import { requireUserId } from '../../lib/http-params.js';
import { requestMeta, sendAuthResult } from './auth.controller.js';
import { AppError } from '../../errors/app-error.js';

export async function setup(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await totpService.setupTOTP(userId);
  res.status(200).json(result);
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { token } = req.body as { token?: string };
  if (!token) {
    throw new AppError('bad_request', 'Verification code is required.', 400);
  }
  const backupCodes = await totpService.confirmTOTP(userId, token);
  res.status(200).json({ backup_codes: backupCodes });
}

export async function disable(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { token } = req.body as { token?: string };
  if (!token) {
    throw new AppError('bad_request', 'Verification code is required to disable TOTP.', 400);
  }
  await totpService.disableTOTP(userId, token);
  res.status(204).end();
}

export async function regenerateBackupCodes(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { token } = req.body as { token?: string };
  if (!token) {
    throw new AppError(
      'bad_request',
      'Verification code is required to regenerate backup codes.',
      400,
    );
  }
  const backupCodes = await totpService.regenerateBackupCodes(userId, token);
  res.status(200).json({ backup_codes: backupCodes });
}

export async function verify(req: Request, res: Response): Promise<void> {
  const { email, password, code, rememberMe } = req.body as {
    email?: string;
    password?: string;
    code?: string;
    rememberMe?: boolean;
  };
  if (!email || !password || !code) {
    throw new AppError('bad_request', 'Email, password, and verification code are required.', 400);
  }
  const result = await authService.verifyTOTPAndLogin(
    { email, password, code, rememberMe: rememberMe ?? false },
    requestMeta(req),
  );
  sendAuthResult(res, result);
}
