/**
 * Onboarding feature router (task 9.4), mounted at `/api/v1/onboarding`.
 *
 * - GET / returns the signed-in user's onboarding checklist + progress.
 * - POST /:taskKey marks a task complete (idempotent). The task key is
 *   validated against the onboarding catalog.
 */
import { Router } from 'express';
export declare function onboardingRouter(): Router;
//# sourceMappingURL=onboarding.routes.d.ts.map