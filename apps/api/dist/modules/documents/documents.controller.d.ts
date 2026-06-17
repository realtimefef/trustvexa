/**
 * Documents HTTP controller (task 7.8). Read-only; the caller id comes from the
 * verified JWT and access is enforced in the service against the deal parties.
 */
import type { Request, Response } from 'express';
export declare function getDealDocuments(req: Request, res: Response): Promise<void>;
/** Stream the deal-agreement PDF for a party to the deal. */
export declare function getAgreementPdf(req: Request, res: Response): Promise<void>;
/** Stream the branded receipt PDF for a settled deal the caller is party to. */
export declare function getReceiptPdf(req: Request, res: Response): Promise<void>;
/** Stream the final dispute-decision PDF for a resolved dispute. */
export declare function getDisputeDecisionPdf(req: Request, res: Response): Promise<void>;
/** Download the caller's own data export as JSON (never another user's data). */
export declare function getDataExport(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=documents.controller.d.ts.map