/**
 * Onboarding feature router (task 9.4), mounted at `/api/v1/onboarding`.
 *
 * - GET / returns the signed-in user's onboarding checklist + progress.
 * - POST /:taskKey marks a task complete (idempotent). The task key is
 *   validated against the onboarding catalog.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './onboarding.controller.js';
import { ONBOARDING_TASKS } from './onboarding.js';
const TASK_KEYS = ONBOARDING_TASKS.map((t) => t.key);
const taskKeyParamSchema = z.object({ taskKey: z.enum(TASK_KEYS) });
const ACCOUNT_ROLES = ['user', 'middleman'];
export function onboardingRouter() {
    const router = Router();
    router.get('/', ...apiChain({ roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.getOnboarding));
    router.post('/:taskKey', ...apiChain({ schemas: { params: taskKeyParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.completeTask));
    return router;
}
//# sourceMappingURL=onboarding.routes.js.map