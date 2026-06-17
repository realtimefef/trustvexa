/**
 * Wallets HTTP controllers. The authenticated user id always comes from the
 * verified JWT (`requireUserId`), never from the request body, so a caller can
 * only read and write their own wallets.
 */
import type { Request, Response } from 'express';
export declare function listAddressBook(req: Request, res: Response): Promise<void>;
export declare function addAddress(req: Request, res: Response): Promise<void>;
export declare function deleteAddress(req: Request, res: Response): Promise<void>;
export declare function validateAddress(req: Request, res: Response): Promise<void>;
export declare function createChangeRequest(req: Request, res: Response): Promise<void>;
export declare function listChangeRequests(req: Request, res: Response): Promise<void>;
export declare function getWalletInfo(req: Request, res: Response): Promise<void>;
export declare function withdraw(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=wallets.controller.d.ts.map