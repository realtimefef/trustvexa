/**
 * Zod schemas for final terms acceptance (task 4.7, Requirement 11.4). The deal
 * id comes from the route param. Every per-deal legal acknowledgement must be
 * explicitly true, and the accepted policy versions are echoed so the server
 * can reject stale versions (Requirement 11.5).
 */
import { z } from 'zod';

export const acceptTermsSchema = z
  .object({
    acceptedTermsVersion: z.string().min(1).max(50),
    acceptedDisputePolicyVersion: z.string().min(1).max(50),
    acceptedCryptoRisk: z.literal(true),
    acceptedWrongNetworkWarning: z.literal(true),
    acceptedNoProhibitedItems: z.literal(true),
  })
  .strict();
export type AcceptTermsInput = z.infer<typeof acceptTermsSchema>;
