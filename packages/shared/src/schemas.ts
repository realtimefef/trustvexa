import { z } from 'zod';
import { SUPPORTED_COINS, SUPPORTED_NETWORKS } from './constants.js';

/**
 * Minimal shared Zod schemas. These are intended to be shared between client
 * and server so both validate identically (design: Frontend/API). Domain
 * schemas are added in later tasks.
 */

export const coinSchema = z.enum(SUPPORTED_COINS);

export const networkSchema = z.enum(SUPPORTED_NETWORKS);

/** Standard API error envelope (Requirement 44.4). */
export const errorEnvelopeSchema = z.object({
  error_code: z.string(),
  message: z.string(),
  request_id: z.string(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
