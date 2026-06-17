import type { Request, Response } from 'express';
export declare function setup(req: Request, res: Response): Promise<void>;
export declare function confirm(req: Request, res: Response): Promise<void>;
export declare function disable(req: Request, res: Response): Promise<void>;
export declare function regenerateBackupCodes(req: Request, res: Response): Promise<void>;
export declare function verify(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=totp.controller.d.ts.map