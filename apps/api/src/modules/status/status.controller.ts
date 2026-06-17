/**
 * Platform-status HTTP controller (Build Spec §3 "Support / misc"). Public,
 * read-only.
 */
import type { Request, Response } from 'express';

import * as service from './status.service.js';

export async function getStatus(_req: Request, res: Response): Promise<void> {
  const result = await service.getPlatformStatus();
  res.status(200).json(result);
}
