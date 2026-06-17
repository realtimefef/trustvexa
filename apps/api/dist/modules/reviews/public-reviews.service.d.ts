export interface PublicReviewView {
    id: string;
    authorId: string;
    authorUsername: string | null;
    rating: number;
    title: string | null;
    body: string;
    reply: string | null;
    repliedAt: string | null;
    createdAt: string | null;
    /** Only present in the moderation view. */
    hidden?: boolean;
    deletedAt?: string | null;
}
export interface SubmitPublicReviewInput {
    rating: number;
    title: string | null;
    body: string;
}
/** Any signed-in user posts a public review (rate-limited per author). */
export declare function submitPublicReview(authorId: string, input: SubmitPublicReviewInput): Promise<PublicReviewView>;
export interface PublicReviewsResult {
    reviews: PublicReviewView[];
    count: number;
    averageRating: number;
}
/** Public list of visible reviews with an aggregate rating. */
export declare function listPublicReviews(limit?: number, offset?: number): Promise<PublicReviewsResult>;
/** Middleman moderation list (includes hidden + soft-deleted). */
export declare function listPublicReviewsForModeration(limit?: number, offset?: number): Promise<{
    reviews: PublicReviewView[];
}>;
export interface ModerationContext {
    actorId: string;
    reviewId: string;
    requestId: string;
}
export interface EditPublicReviewInput extends ModerationContext {
    rating: number;
    title: string | null;
    body: string;
    reason: string;
}
/** Middleman edits the review content. Audited. */
export declare function editPublicReview(input: EditPublicReviewInput): Promise<{
    reviewId: string;
    auditId: string;
}>;
export interface ReplyPublicReviewInput extends ModerationContext {
    reply: string | null;
}
/** Middleman posts (or clears) a public reply to a review. Audited. */
export declare function replyToPublicReview(input: ReplyPublicReviewInput): Promise<{
    reviewId: string;
    auditId: string;
}>;
export interface SetHiddenInput extends ModerationContext {
    hidden: boolean;
    reason: string;
}
/** Middleman hides/unhides a review. Audited. */
export declare function setPublicReviewVisibility(input: SetHiddenInput): Promise<{
    reviewId: string;
    hidden: boolean;
    auditId: string;
}>;
export interface DeletePublicReviewInput extends ModerationContext {
    reason: string;
}
/** Middleman soft-deletes a review. Audited. */
export declare function deletePublicReview(input: DeletePublicReviewInput): Promise<{
    reviewId: string;
    auditId: string;
}>;
//# sourceMappingURL=public-reviews.service.d.ts.map