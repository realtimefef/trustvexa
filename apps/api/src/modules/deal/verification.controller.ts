/**
 * Verification-code HTTP controllers (task 4.5). The authenticated user id
 * comes from the verified JWT (`req.auth`), never the body. Request returns
 * 201 (a new code was issued); verify returns 200.
 */
import type { Request, Response } from 'express';

import type { SubmitVerificationInput } from './verification.schemas.js';
import * as verification from './verification.service.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function requestCode(req: Request, res: Response): Promise<void> {
  const requesterId = requireUserId(req);
  const result = await verification.requestVerificationCode({
    dealId: req.params.id!,
    requesterId,
  });
  res.status(201).json(result);
}

export async function submitCode(req: Request, res: Response): Promise<void> {
  const submitterId = requireUserId(req);
  const { code } = req.body as SubmitVerificationInput;
  const result = await verification.submitVerificationCode({
    dealId: req.params.id!,
    submitterId,
    code,
  });
  res.status(200).json(result);
}
