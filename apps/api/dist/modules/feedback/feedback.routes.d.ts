/**
 * Feedback feature router. (Audit FIX-P3-5 — refactored to follow the
 * routes → controller → service → repository layering convention used by all
 * other modules. Business logic moved to feedback.service.ts.)
 */
import { Router } from 'express';
import { z } from 'zod';
export declare const feedbackSchema: z.ZodObject<{
    rating: z.ZodNumber;
    message: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    rating: number;
    message?: string | undefined;
    category?: string | undefined;
}, {
    rating: number;
    message?: string | undefined;
    category?: string | undefined;
}>;
export declare function feedbackRouter(): Router;
//# sourceMappingURL=feedback.routes.d.ts.map