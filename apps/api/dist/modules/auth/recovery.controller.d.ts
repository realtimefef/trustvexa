/**
 * HTTP controllers for recovery, verification, credential-change and step-up
 * endpoints (tasks 3.6, 3.7). Validation runs in slot 5; authenticated routes
 * always carry `req.auth` after slots 6–7.
 */
import type { Request, Response } from 'express';
export declare function requestEmailVerification(req: Request, res: Response): Promise<void>;
export declare function verifyEmail(req: Request, res: Response): Promise<void>;
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
export declare function resetPassword(req: Request, res: Response): Promise<void>;
export declare function changePassword(req: Request, res: Response): Promise<void>;
export declare function changeEmail(req: Request, res: Response): Promise<void>;
export declare function setRecoveryEmail(req: Request, res: Response): Promise<void>;
export declare function requestStepUp(req: Request, res: Response): Promise<void>;
export declare function confirmStepUp(req: Request, res: Response): Promise<void>;
export declare function acceptPolicy(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=recovery.controller.d.ts.map