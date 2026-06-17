/**
 * Feedback feature router. (Audit FIX-P3-5 — refactored to follow the
 * routes → controller → service → repository layering convention used by all
 * other modules. Business logic moved to feedback.service.ts.)
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './feedback.controller.js';
export const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5),
    message: z.string().trim().max(4000).optional(),
    category: z.string().trim().max(100).optional(),
});
export function feedbackRouter() {
    const router = Router();
    router.post('/', ...apiChain({
        schemas: { body: feedbackSchema },
        roles: ['user', 'middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.submitFeedback));
    return router;
}
//# sourceMappingURL=feedback.routes.js.map