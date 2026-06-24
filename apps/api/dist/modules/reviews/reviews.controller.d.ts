/**
 * Reviews + trust HTTP controllers (task 7.6). The public reviews read takes a
 * reviewee id from the validated path; the trust read derives the user from the
 * verified JWT so a caller can only see their own restriction status.
 */
import type { Request, Response } from 'express';
export declare function getUserReviews(req: Request, res: Response): Promise<void>;
export declare function getMyTrust(req: Request, res: Response): Promise<void>;
export declare function submitReview(req: Request, res: Response): Promise<void>;
/** Whether the caller already reviewed this deal (so the UI shows the right state). */
export declare function getMyDealReviewStatus(req: Request, res: Response): Promise<void>;
/** Middleman: list every review about a user (including hidden) for moderation. */
export declare function listReviewsForModeration(req: Request, res: Response): Promise<void>;
/** Middleman: hide or unhide a review (audited, reason required). */
export declare function moderateReview(req: Request, res: Response): Promise<void>;
/** Public: list visible public reviews + aggregate rating. */
export declare function listPublicReviews(req: Request, res: Response): Promise<void>;
/** Any signed-in user: post a public review. */
export declare function submitPublicReview(req: Request, res: Response): Promise<void>;
/** Middleman: list all public reviews (incl. hidden + deleted) for moderation. */
export declare function listPublicReviewsForModeration(req: Request, res: Response): Promise<void>;
/** Middleman: edit a public review's content. */
export declare function editPublicReview(req: Request, res: Response): Promise<void>;
/** Middleman: post or clear a public reply to a review. */
export declare function replyToPublicReview(req: Request, res: Response): Promise<void>;
/** Middleman: hide/unhide a public review. */
export declare function setPublicReviewVisibility(req: Request, res: Response): Promise<void>;
/** Middleman: soft-delete a public review. */
export declare function deletePublicReview(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=reviews.controller.d.ts.map