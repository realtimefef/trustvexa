/**
 * Terms & final-confirmation HTTP controllers (task 4.7). The authenticated
 * user id comes from the verified JWT (`req.auth`), never the body.
 */
import type { Request, Response } from 'express';
export declare function getAgreement(req: Request, res: Response): Promise<void>;
export declare function acceptTerms(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=terms.controller.d.ts.map