/**
 * Announcements HTTP controllers (Build Spec §3 "Support / misc").
 *
 * The caller (and their audience) is derived from the verified JWT; nothing is
 * trusted from request input. Marking read is idempotent.
 */
import type { Request, Response } from 'express';
export declare function listAnnouncements(req: Request, res: Response): Promise<void>;
export declare function markRead(req: Request, res: Response): Promise<void>;
export declare function getAnnouncement(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=announcements.controller.d.ts.map