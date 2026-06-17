/**
 * Zod schemas for amendments and mutual cancellation (task 4.8). Deal,
 * amendment, and cancellation ids come from route params, never the body.
 */
import { z } from 'zod';
export declare const requestAmendmentSchema: z.ZodObject<{
    changeType: z.ZodEnum<["amount", "product", "fee_payer", "coin", "network", "terms", "inspection_window", "other"]>;
    oldValue: z.ZodOptional<z.ZodString>;
    newValue: z.ZodString;
}, "strict", z.ZodTypeAny, {
    newValue: string;
    changeType: "terms" | "coin" | "network" | "amount" | "product" | "fee_payer" | "inspection_window" | "other";
    oldValue?: string | undefined;
}, {
    newValue: string;
    changeType: "terms" | "coin" | "network" | "amount" | "product" | "fee_payer" | "inspection_window" | "other";
    oldValue?: string | undefined;
}>;
export type RequestAmendmentInput = z.infer<typeof requestAmendmentSchema>;
export declare const decisionSchema: z.ZodObject<{
    decision: z.ZodEnum<["approve", "reject"]>;
}, "strict", z.ZodTypeAny, {
    decision: "reject" | "approve";
}, {
    decision: "reject" | "approve";
}>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export declare const middlemanDecisionSchema: z.ZodObject<{
    decision: z.ZodEnum<["approve", "reject"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    decision: "reject" | "approve";
    note?: string | undefined;
}, {
    decision: "reject" | "approve";
    note?: string | undefined;
}>;
export type MiddlemanDecisionInput = z.infer<typeof middlemanDecisionSchema>;
export declare const requestCancellationSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type RequestCancellationInput = z.infer<typeof requestCancellationSchema>;
export declare const amendmentParamSchema: z.ZodObject<{
    id: z.ZodString;
    amendmentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    amendmentId: string;
}, {
    id: string;
    amendmentId: string;
}>;
export declare const cancellationParamSchema: z.ZodObject<{
    id: z.ZodString;
    cancellationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    cancellationId: string;
}, {
    id: string;
    cancellationId: string;
}>;
//# sourceMappingURL=amendment.schemas.d.ts.map