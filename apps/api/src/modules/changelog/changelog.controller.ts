/**
 * Changelog HTTP controller (Build Spec §3 "Support / misc"). Public,
 * read-only.
 */
import type { Request, Response } from 'express';

import * as service from './changelog.service.js';

export async function listChangelog(_req: Request, res: Response): Promise<void> {
  const result = await service.listChangelog();
  res.status(200).json({ entries: result });
}
