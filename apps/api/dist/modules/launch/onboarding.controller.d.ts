/**
 * Onboarding HTTP controllers (task 9.4). The user id always comes from the
 * verified JWT; the task key is validated against the onboarding catalog by the
 * route schema before it reaches the service.
 */
import type { Request, Response } from 'express';
export declare function getOnboarding(req: Request, res: Response): Promise<void>;
export declare function completeTask(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=onboarding.controller.d.ts.map