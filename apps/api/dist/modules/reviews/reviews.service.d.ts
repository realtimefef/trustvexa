import { type TrustRestriction } from './trust-restrictions.js';
export interface PublicReview {
    id: string;
    dealId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}
export interface UserReviews {
    revieweeId: string;
    count: number;
    averageRating: number;
    reviews: PublicReview[];
}
export declare function getUserReviews(revieweeId: string): Promise<UserReviews>;
export interface TrustStatus {
    missedDeadlineCount: number;
    restriction: TrustRestriction;
}
export declare function getTrustStatus(userId: string): Promise<TrustStatus>;
export interface SubmitReviewInput {
    rating: number;
    comment: string | null;
}
/**
 * Whether the caller has already reviewed this deal, plus whether the deal is
 * even reviewable for them. Lets the UI show the right state on load (so a
 * refresh after submitting doesn't re-prompt for a review). Returns
 * `reviewed: false` for deals the caller isn't a party to rather than leaking
 * existence.
 */
export declare function getMyDealReviewStatus(userId: string, dealId: string): Promise<{
    reviewed: boolean;
    eligible: boolean;
}>;
export interface SubmitReviewResult {
    id: string;
    dealId: string;
    revieweeId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
}
/**
 * Submit a review of the counterparty on a completed deal. Eligibility is
 * enforced entirely server-side: the caller must be a party to the deal, the
 * deal must be a real (non-practice) deal in a terminal settlement state, and
 * only the buyer or seller may review (the reviewee is resolved as the other
 * party — the middleman is never reviewed here). The one-review-per-deal rule
 * is guaranteed by the UNIQUE(deal_id, reviewer_id) constraint plus a
 * pre-check inside the same transaction. (Requirements 25.x, 26.1-26.10)
 */
export declare function submitReview(userId: string, dealId: string, input: SubmitReviewInput): Promise<SubmitReviewResult>;
//# sourceMappingURL=reviews.service.d.ts.map