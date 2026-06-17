/**
 * Amendment & mutual-cancellation HTTP controllers (task 4.8). The
 * authenticated user id comes from the verified JWT (`req.auth`), never the
 * request body.
 */
import type { Request, Response } from 'express';
export declare function requestAmendment(req: Request, res: Response): Promise<void>;
export declare function listAmendments(req: Request, res: Response): Promise<void>;
export declare function decideAmendment(req: Request, res: Response): Promise<void>;
export declare function requestCancellation(req: Request, res: Response): Promise<void>;
export declare function listCancellations(req: Request, res: Response): Promise<void>;
export declare function decideCancellation(req: Request, res: Response): Promise<void>;
export declare function decideCancellationAsMiddleman(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=amendment.controller.d.ts.map