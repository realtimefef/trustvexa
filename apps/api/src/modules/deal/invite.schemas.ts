/**
 * Zod schemas for secure seller invites (task 4.3, Requirements 8.1-8.5).
 */
import { z } from 'zod';

/** Create an invite for a deal. */
export const createInviteSchema = z
  .object({
    intendedUserHint: z.string().trim().max(200).optional(),
    expiresInHours: z.number().int().min(1).max(720).optional(),
    singleUse: z.boolean().optional(),
  })
  .strict();
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/** Token presented by a recipient (base64url, 32 bytes -> ~43 chars). */
const tokenSchema = z
  .string()
  .min(20)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/, 'Malformed invite token.');

export const inviteTokenSchema = z.object({ token: tokenSchema }).strict();
export type InviteTokenInput = z.infer<typeof inviteTokenSchema>;

export const revokeInviteSchema = z
  .object({ reason: z.string().trim().max(280).optional() })
  .strict();
export type RevokeInviteInput = z.infer<typeof revokeInviteSchema>;

export const inviteIdParamSchema = z.object({ id: z.string().uuid() });
