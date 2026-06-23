/**
 * Middleman/admin console HTTP controllers (task 7.2). Thin translation between
 * HTTP and the admin service; both routes are read-only and return 200. The
 * middleman id comes from the verified JWT (`req.auth`), and the route chain
 * restricts these endpoints to the `middleman` role.
 */
import type { Request, Response } from 'express';
export declare function getQueue(req: Request, res: Response): Promise<void>;
export declare function getDisputes(req: Request, res: Response): Promise<void>;
export declare function getRisk(req: Request, res: Response): Promise<void>;
export declare function getCriticalSettings(_req: Request, res: Response): Promise<void>;
export declare function listSettingChanges(req: Request, res: Response): Promise<void>;
export declare function requestSettingChange(req: Request, res: Response): Promise<void>;
export declare function applySettingChange(req: Request, res: Response): Promise<void>;
export declare function rollbackSettingChange(req: Request, res: Response): Promise<void>;
/**
 * Enforcement actions on a user: block / unblock / label / trust-downgrade.
 * Each action is fully audited inside the enforcement service's transaction.
 */
export declare function enforce(req: Request, res: Response): Promise<void>;
export declare function blockUser(req: Request, res: Response): Promise<void>;
/** Permanently soft-delete a user account (audited, requires reason). */
export declare function deleteUser(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map