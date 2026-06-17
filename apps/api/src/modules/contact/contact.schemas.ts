/**
 * Zod schema for the public contact form (task 8.3, Requirement 42.8).
 *
 * Re-usable on the client so the browser and the server validate identically.
 * Kept deliberately small: name, email, an optional subject, and a message.
 */
import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(5000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
