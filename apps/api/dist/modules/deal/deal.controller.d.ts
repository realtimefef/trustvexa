/**
 * Deal HTTP controllers (task 4.1).
 *
 * Thin translation between HTTP and the deal services. The authenticated user
 * id comes from the verified JWT (`req.auth`), never from the request body, so
 * a client cannot create or duplicate deals as someone else. Create and
 * duplicate return 201; draft writes return 200 and a delete returns 204.
 */
import type { Request, Response } from 'express';
export declare function createDeal(req: Request, res: Response): Promise<void>;
export declare function duplicateDeal(req: Request, res: Response): Promise<void>;
export declare function saveDraft(req: Request, res: Response): Promise<void>;
export declare function listDrafts(req: Request, res: Response): Promise<void>;
export declare function getDraft(req: Request, res: Response): Promise<void>;
export declare function deleteDraft(req: Request, res: Response): Promise<void>;
export declare function updateTags(req: Request, res: Response): Promise<void>;
/** Seller edits deal parameters before both parties lock. */
export declare function updateDeal(req: Request, res: Response): Promise<void>;
/** Mark deal done — closes all chat rooms for the deal. */
export declare function markDealDone(req: Request, res: Response): Promise<void>;
/** One-click: attach an available middleman to the deal (buyer or seller). */
export declare function requestMiddleman(req: Request, res: Response): Promise<void>;
/** Mark the caller's agreement; locks the deal once both parties agree. */
export declare function agreeToDeal(req: Request, res: Response): Promise<void>;
/** Buyer/seller advances a no-middleman deal SellerHandover → Delivered. */
export declare function advanceDeliveryNoMiddleman(req: Request, res: Response): Promise<void>;
/** Middleman marks the deal complete — chains transitions to Released. */
export declare function markDealComplete(req: Request, res: Response): Promise<void>;
/** Buyer/middleman manually confirms funding — transitions Confirmed → Funded. */
export declare function confirmFunding(req: Request, res: Response): Promise<void>;
/** Seller submits handover — transitions Funded → SellerHandover. */
export declare function sellerHandover(req: Request, res: Response): Promise<void>;
/** Middleman confirms delivery to buyer — transitions MiddlemanVerified → Delivered. */
export declare function deliverToBuyer(req: Request, res: Response): Promise<void>;
/** Buyer approves delivery — transitions Delivered → Approved. */
export declare function approveDeal(req: Request, res: Response): Promise<void>;
/** Middleman confirms seller handover — transitions SellerHandover → MiddlemanVerified. */
export declare function verifyHandover(req: Request, res: Response): Promise<void>;
/**
 * Middleman-only: modify a deal's amount, terms, or status after it is locked.
 * Only the deal's assigned middleman may call this.
 */
export declare function middlemanUpdateDeal(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=deal.controller.d.ts.map