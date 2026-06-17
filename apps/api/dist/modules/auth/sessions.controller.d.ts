/**
 * HTTP controllers for session/device management + security log (task 3.8).
 */
import type { Request, Response } from 'express';
export declare function list(req: Request, res: Response): Promise<void>;
export declare function revoke(req: Request, res: Response): Promise<void>;
export declare function securityLog(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=sessions.controller.d.ts.map