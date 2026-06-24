/**
 * HTTP controllers for the extended operator Trust & Safety / Compliance
 * surface: legal holds, appeals, AML alerts, break-glass, and audited PII
 * access. Actor id comes from the verified JWT; the request id from logging
 * middleware; all writes are audited inside the service.
 */
import type { Request, Response } from 'express';
export declare function listLegalHolds(req: Request, res: Response): Promise<void>;
export declare function placeLegalHold(req: Request, res: Response): Promise<void>;
export declare function releaseLegalHold(req: Request, res: Response): Promise<void>;
export declare function listAppeals(req: Request, res: Response): Promise<void>;
export declare function decideAppeal(req: Request, res: Response): Promise<void>;
export declare function listAmlAlerts(req: Request, res: Response): Promise<void>;
export declare function updateAmlAlert(req: Request, res: Response): Promise<void>;
export declare function listBreakGlass(req: Request, res: Response): Promise<void>;
export declare function recordBreakGlass(req: Request, res: Response): Promise<void>;
export declare function lookupUserPii(req: Request, res: Response): Promise<void>;
export declare function listPiiAccessLogs(req: Request, res: Response): Promise<void>;
export declare function listWithdrawalAllowlist(req: Request, res: Response): Promise<void>;
export declare function addWithdrawalAllowlist(req: Request, res: Response): Promise<void>;
export declare function setWithdrawalAllowlistActive(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=admin-extra.controller.d.ts.map