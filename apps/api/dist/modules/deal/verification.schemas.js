/**
 * Zod schemas for the 48-digit verification code (task 4.5, Requirement 10).
 * The deal id comes from the route param (`dealIdParamSchema` in deal.schemas).
 */
import { z } from 'zod';
export const submitVerificationSchema = z
    .object({
    code: z.string().regex(/^\d{48}$/, 'Verification code must be exactly 48 digits.'),
})
    .strict();
//# sourceMappingURL=verification.schemas.js.map