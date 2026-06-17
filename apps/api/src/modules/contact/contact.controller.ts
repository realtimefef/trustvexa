/**
 * HTTP controller for the public contact form (task 8.3).
 *
 * Thin translation between HTTP and the contact service. The route is public,
 * so there is no auth context to read; validation is handled by the Zod schema
 * in the middleware chain.
 */
import type { Request, Response } from 'express';

import * as contactService from './contact.service.js';
import type { ContactMessageInput } from './contact.schemas.js';

export async function submit(req: Request, res: Response): Promise<void> {
  const result = await contactService.submitContactMessage(req.body as ContactMessageInput);
  res.status(201).json({
    id: result.id,
    status: result.status,
    created_at: result.createdAt,
  });
}
