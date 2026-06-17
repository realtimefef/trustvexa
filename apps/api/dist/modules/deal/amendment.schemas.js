/**
 * Zod schemas for amendments and mutual cancellation (task 4.8). Deal,
 * amendment, and cancellation ids come from route params, never the body.
 */
import { z } from 'zod';
export const requestAmendmentSchema = z
    .object({
    changeType: z.enum([
        'amount',
        'product',
        'fee_payer',
        'coin',
        'network',
        'terms',
        'inspection_window',
        'other',
    ]),
    oldValue: z.string().max(4000).optional(),
    newValue: z.string().min(1).max(4000),
})
    .strict();
export const decisionSchema = z
    .object({
    decision: z.enum(['approve', 'reject']),
})
    .strict();
export const middlemanDecisionSchema = z
    .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().max(500).optional(),
})
    .strict();
export const requestCancellationSchema = z
    .object({
    reason: z.string().max(500).optional(),
})
    .strict();
export const amendmentParamSchema = z.object({
    id: z.string().uuid(),
    amendmentId: z.string().uuid(),
});
export const cancellationParamSchema = z.object({
    id: z.string().uuid(),
    cancellationId: z.string().uuid(),
});
//# sourceMappingURL=amendment.schemas.js.map