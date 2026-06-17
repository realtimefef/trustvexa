/**
 * Referral program HTTP controllers (Build Spec §3 "Support / misc").
 *
 * The owner is always derived from the verified JWT (`requireUserId`), never
 * from request input. Creating the code is idempotent get-or-create.
 */
import type { Request, Response } from 'express';
export declare function listReferrals(req: Request, res: Response): Promise<void>;
export declare function createCode(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=referrals.controller.d.ts.map