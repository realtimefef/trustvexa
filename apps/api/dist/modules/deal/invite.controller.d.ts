/**
 * Invite HTTP controllers (task 4.3). The authenticated user id comes from the
 * verified JWT (`req.auth`), never the body. Create returns 201; accept,
 * preview, and list return 200; revoke returns 204.
 */
import type { Request, Response } from 'express';
export declare function createInvite(req: Request, res: Response): Promise<void>;
export declare function listInvites(req: Request, res: Response): Promise<void>;
export declare function previewInvite(req: Request, res: Response): Promise<void>;
export declare function acceptInvite(req: Request, res: Response): Promise<void>;
export declare function revokeInvite(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=invite.controller.d.ts.map