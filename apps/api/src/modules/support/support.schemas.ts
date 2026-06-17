/**
 * Zod schemas for the support-tickets module (Build Spec §3 "Support / misc").
 *
 * Kept small and shareable with the client. `priority` mirrors the documented
 * support_tickets values (`normal` / `urgent` / `money_issue`); `category` is
 * a short free-text label since the migration does not constrain it.
 */
import { z } from 'zod';

export const createTicketSchema = z.object({
  category: z.string().trim().min(1).max(80),
  priority: z.enum(['normal', 'urgent', 'money_issue']).default('normal'),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketIdParamSchema = z.object({
  id: z.string().uuid(),
});
