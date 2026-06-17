import { z } from 'zod';
import { isSafeWebhookUrl } from './webhook-url.js';

export const createWebhookSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Must be a valid HTTPS URL')
    .refine(isSafeWebhookUrl, 'Webhook URL must be public HTTPS'),
  events: z
    .array(z.enum(['deal.funded', 'deal.completed', 'deal.disputed', 'payout.broadcast']))
    .min(1, 'At least one event type must be specified'),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
