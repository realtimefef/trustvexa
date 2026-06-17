/**
 * Onboarding HTTP controllers (task 9.4). The user id always comes from the
 * verified JWT; the task key is validated against the onboarding catalog by the
 * route schema before it reaches the service.
 */
import type { Request, Response } from 'express';

import type { OnboardingTaskKey } from './onboarding.js';
import * as service from './onboarding.service.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function getOnboarding(req: Request, res: Response): Promise<void> {
  const result = await service.getOnboarding(requireUserId(req));
  res.status(200).json(result);
}

export async function completeTask(req: Request, res: Response): Promise<void> {
  const taskKey = req.params.taskKey as OnboardingTaskKey;
  const result = await service.completeTask(requireUserId(req), taskKey);
  res.status(200).json(result);
}
