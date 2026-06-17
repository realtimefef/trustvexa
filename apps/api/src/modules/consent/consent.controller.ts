/**
 * HTTP controller for recording cookie consent (task 8.3).
 *
 * The route is public, so the request may be anonymous; `req.auth?.userId` is
 * passed through (null when anonymous) and the opaque `visitorId` carries the
 * attribution in that case. Validation is handled by the Zod schema in the
 * middleware chain.
 */
import type { Request, Response } from 'express';

import * as consentService from './consent.service.js';
import type { CookieConsentInput } from './consent.schemas.js';

export async function recordConsent(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId ?? null;
  const result = await consentService.recordCookieConsent(userId, req.body as CookieConsentInput);
  res.status(201).json({
    id: result.id,
    consented_at: result.consentedAt,
  });
}
