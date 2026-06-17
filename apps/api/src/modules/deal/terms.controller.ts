/**
 * Terms & final-confirmation HTTP controllers (task 4.7). The authenticated
 * user id comes from the verified JWT (`req.auth`), never the body.
 */
import type { Request, Response } from 'express';

import type { AcceptTermsInput } from './terms.schemas.js';
import * as terms from './terms.service.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function getAgreement(req: Request, res: Response): Promise<void> {
  const requesterId = requireUserId(req);
  const result = await terms.getAgreement({ dealId: req.params.id!, requesterId });
  res.status(200).json(result);
}

export async function acceptTerms(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await terms.acceptTerms({
    dealId: req.params.id!,
    userId,
    input: req.body as AcceptTermsInput,
  });
  res.status(200).json(result);
}
