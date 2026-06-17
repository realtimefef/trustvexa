/**
 * HTTP controllers for the extended middleman/admin operations surface
 * (Plan §25/§33/§4): deal & user search, analytics, manual holds, overrides,
 * private notes, emergency pauses, and feature flags. Thin translation only —
 * the actor id comes from the verified JWT, the request id from the logging
 * middleware, and every audited write is performed in the service.
 */
import type { Request, Response } from 'express';
export declare function searchDeals(req: Request, res: Response): Promise<void>;
export declare function searchUsers(req: Request, res: Response): Promise<void>;
export declare function getAnalytics(req: Request, res: Response): Promise<void>;
export declare function listHolds(req: Request, res: Response): Promise<void>;
export declare function placeHold(req: Request, res: Response): Promise<void>;
export declare function releaseHold(req: Request, res: Response): Promise<void>;
export declare function listOverrides(req: Request, res: Response): Promise<void>;
export declare function recordOverride(req: Request, res: Response): Promise<void>;
export declare function listNotes(req: Request, res: Response): Promise<void>;
export declare function addNote(req: Request, res: Response): Promise<void>;
export declare function listPauses(req: Request, res: Response): Promise<void>;
export declare function startPause(req: Request, res: Response): Promise<void>;
export declare function endPause(req: Request, res: Response): Promise<void>;
export declare function listFeatureFlags(req: Request, res: Response): Promise<void>;
export declare function toggleFeatureFlag(req: Request, res: Response): Promise<void>;
export declare function getAuditLog(req: Request, res: Response): Promise<void>;
export declare function createAnnouncement(req: Request, res: Response): Promise<void>;
export declare function searchChats(req: Request, res: Response): Promise<void>;
export declare function deleteChat(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=admin-ops.controller.d.ts.map