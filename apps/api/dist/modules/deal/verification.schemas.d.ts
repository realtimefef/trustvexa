/**
 * Zod schemas for the 48-digit verification code (task 4.5, Requirement 10).
 * The deal id comes from the route param (`dealIdParamSchema` in deal.schemas).
 */
import { z } from 'zod';
export declare const submitVerificationSchema: z.ZodObject<{
    code: z.ZodString;
}, "strict", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;
//# sourceMappingURL=verification.schemas.d.ts.map