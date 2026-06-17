/**
 * Support-tickets router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/support`.
 *
 * User routes — callers read/write their own tickets only:
 *   POST /tickets              — create (Idempotency-Key required)
 *   GET  /tickets              — list caller's tickets
 *   GET  /tickets/:id          — get one of caller's tickets
 *
 * Middleman routes — full ticket management console:
 *   GET  /admin/tickets        — list ALL tickets (filters: status, priority, category)
 *   GET  /admin/tickets/:id    — get any ticket + replies
 *   POST /admin/tickets/:id/reply  — reply and optionally update status
 *   PATCH /admin/tickets/:id/status — update status only
 */
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './support.controller.js';
import { createTicketSchema, ticketIdParamSchema } from './support.schemas.js';
import {
  listAdminTickets,
  getAdminTicket,
  updateAdminTicketStatus,
  replyToTicket,
  VALID_TICKET_STATUSES,
} from './support.service.js';
import { requireParam, requireUserId } from '../../lib/http-params.js';
import type { Request, Response } from 'express';

const ROLES: Array<'user' | 'middleman'> = ['user', 'middleman'];

const adminTicketParamSchema = z.object({ id: z.string().uuid() });

const replyBodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  status: z.enum(VALID_TICKET_STATUSES).optional(),
});

const statusBodySchema = z.object({
  status: z.enum(VALID_TICKET_STATUSES),
});

const adminTicketsQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export function supportRouter(): Router {
  const router = Router();

  // ── User routes ────────────────────────────────────────────────────────────

  router.post(
    '/tickets',
    ...apiChain({ schemas: { body: createTicketSchema }, roles: ROLES, enforceIdempotency: true }),
    asyncHandler(controller.createTicket),
  );

  router.get('/tickets', ...apiChain({ roles: ROLES }), asyncHandler(controller.listTickets));

  router.get(
    '/tickets/:id',
    ...apiChain({ schemas: { params: ticketIdParamSchema }, roles: ROLES }),
    asyncHandler(controller.getTicket),
  );

  // ── Middleman (admin) routes ────────────────────────────────────────────────

  router.get(
    '/admin/tickets',
    ...apiChain({
      schemas: { query: adminTicketsQuerySchema },
      roles: ['middleman'],
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const q = req.query as z.infer<typeof adminTicketsQuerySchema>;
      // exactOptionalPropertyTypes: only include defined values so undefined is
      // never assigned to a required-optional property.
      const filters: {
        status?: string;
        priority?: string;
        category?: string;
        limit?: number;
        offset?: number;
      } = {};
      if (q.status !== undefined) filters.status = q.status;
      if (q.priority !== undefined) filters.priority = q.priority;
      if (q.category !== undefined) filters.category = q.category;
      if (q.limit !== undefined) filters.limit = q.limit;
      if (q.offset !== undefined) filters.offset = q.offset;
      const result = await listAdminTickets(filters);
      res.status(200).json(result);
    }),
  );

  router.get(
    '/admin/tickets/:id',
    ...apiChain({ schemas: { params: adminTicketParamSchema }, roles: ['middleman'] }),
    asyncHandler(async (req: Request, res: Response) => {
      const id = requireParam(req, 'id');
      const result = await getAdminTicket(id);
      res.status(200).json(result);
    }),
  );

  router.post(
    '/admin/tickets/:id/reply',
    ...apiChain({
      schemas: { params: adminTicketParamSchema, body: replyBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const agentId = requireUserId(req);
      const id = requireParam(req, 'id');
      const { body, status } = req.body as z.infer<typeof replyBodySchema>;
      const result = await replyToTicket(agentId, id, body, status);
      res.status(201).json(result);
    }),
  );

  router.patch(
    '/admin/tickets/:id/status',
    ...apiChain({
      schemas: { params: adminTicketParamSchema, body: statusBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(async (req: Request, res: Response) => {
      const id = requireParam(req, 'id');
      const { status } = req.body as z.infer<typeof statusBodySchema>;
      const result = await updateAdminTicketStatus(id, status);
      res.status(200).json(result);
    }),
  );

  return router;
}
