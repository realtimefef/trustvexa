/**
 * Verification-code HTTP controllers (task 4.5). The authenticated user id
 * comes from the verified JWT (`req.auth`), never the body. Request returns
 * 201 (a new code was issued); verify returns 200.
 */
import type { Request, Response } from 'express';
export declare function requestCode(req: Request, res: Response): Promise<void>;
export declare function submitCode(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=verification.controller.d.ts.map