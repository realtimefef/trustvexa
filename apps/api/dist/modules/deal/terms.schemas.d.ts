/**
 * Zod schemas for final terms acceptance (task 4.7, Requirement 11.4). The deal
 * id comes from the route param. Every per-deal legal acknowledgement must be
 * explicitly true, and the accepted policy versions are echoed so the server
 * can reject stale versions (Requirement 11.5).
 */
import { z } from 'zod';
export declare const acceptTermsSchema: z.ZodObject<{
    acceptedTermsVersion: z.ZodString;
    acceptedDisputePolicyVersion: z.ZodString;
    acceptedCryptoRisk: z.ZodLiteral<true>;
    acceptedWrongNetworkWarning: z.ZodLiteral<true>;
    acceptedNoProhibitedItems: z.ZodLiteral<true>;
}, "strict", z.ZodTypeAny, {
    acceptedTermsVersion: string;
    acceptedDisputePolicyVersion: string;
    acceptedCryptoRisk: true;
    acceptedWrongNetworkWarning: true;
    acceptedNoProhibitedItems: true;
}, {
    acceptedTermsVersion: string;
    acceptedDisputePolicyVersion: string;
    acceptedCryptoRisk: true;
    acceptedWrongNetworkWarning: true;
    acceptedNoProhibitedItems: true;
}>;
export type AcceptTermsInput = z.infer<typeof acceptTermsSchema>;
//# sourceMappingURL=terms.schemas.d.ts.map