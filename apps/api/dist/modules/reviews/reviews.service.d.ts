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