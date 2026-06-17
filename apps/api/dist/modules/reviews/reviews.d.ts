import type { DealStatus } from '../deal/state-machine.js';
export declare const MIN_RATING = 1;
export declare const MAX_RATING = 5;
export declare const MAX_REVIEW_COMMENT_CHARS = 1000;
export type ReviewValidationError = 'rating_out_of_range' | 'rating_not_integer' | 'comment_too_long';
export interface ReviewInput {
    rating: number;
    comment?: string | null;
}
export interface ReviewValidationResult {
    ok: boolean;
    error?: ReviewValidationError;
}
export declare function validateReview(input: ReviewInput): ReviewValidationResult;
export interface ReviewEligibility {
    dealStatus: DealStatus;
    isParty: boolean;
    alreadyReviewed: boolean;
}
export declare function canSubmitReview(e: ReviewEligibility): boolean;
export interface ReviewRecord {
    dealId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string | null;
    isHidden: boolean;
    reviewerUsername: string;
}
export interface PublicReview {
    rating: number;
    comment: string | null;
    reviewerUsername: string;
}
/** Project a review for public display; hidden reviews return null. */
export declare function projectPublicReview(review: ReviewRecord): PublicReview | null;
export interface RatingSummary {
    average: number;
    count: number;
}
/** Average rating over visible reviews only; feeds the trust display. */
export declare function aggregateRating(reviews: ReadonlyArray<{
    rating: number;
    isHidden: boolean;
}>): RatingSummary;
//# sourceMappingURL=reviews.d.ts.map