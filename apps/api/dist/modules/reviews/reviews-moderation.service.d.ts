export interface ModerationReviewView {
    id: string;
    dealId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string | null;
    hidden: boolean;
    createdAt: string;
}
/** List every review about a user (including hidden) for the moderation view. */
export declare function listReviewsForModeration(revieweeId: string): Promise<{
    revieweeId: string;
    reviews: ModerationReviewView[];
}>;
export interface ModerateReviewInput {
    actorId: string;
    reviewId: string;
    hidden: boolean;
    reason: string;
    requestId: string;
}
export interface ModerateReviewResult {
    reviewId: string;
    hidden: boolean;
    auditId: string;
}
/**
 * Hide or unhide a review as the middleman. Requires a reason. The visibility
 * change and its audit row commit together or not at all. Idempotent: setting
 * the same visibility again simply re-affirms it (and is still audited).
 */
export declare function moderateReview(input: ModerateReviewInput): Promise<ModerateReviewResult>;
//# sourceMappingURL=reviews-moderation.service.d.ts.map