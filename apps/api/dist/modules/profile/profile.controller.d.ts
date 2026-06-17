/**
 * Authenticated profile HTTP controllers. The user id is always taken from the
 * verified JWT (via `requireUserId`), so these endpoints are inherently scoped
 * to the caller and can never read or mutate another user's data.
 */
import type { Request, Response } from 'express';
export declare function getMe(req: Request, res: Response): Promise<void>;
export declare function updateProfile(req: Request, res: Response): Promise<void>;
export declare function getPreferences(req: Request, res: Response): Promise<void>;
export declare function updatePreferences(req: Request, res: Response): Promise<void>;
export declare function uploadAvatar(req: Request, res: Response): Promise<void>;
export declare function revokeSessions(req: Request, res: Response): Promise<void>;
export declare function deleteMe(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map