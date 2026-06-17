export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface PublicReviewRow {
    id: string;
    author_id: string;
    rating: number;
    title: string | null;
    body: string;
    is_hidden: boolean;
    deleted_at: Date | string | null;
    reply_body: string | null;
    replied_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
    /** Joined from users for display. */
    author_username?: string | null;
}
export interface InsertPublicReviewInput {
    authorId: string;
    rating: number;
    title: string | null;
    body: string;
}
export declare function insertPublicReview(input: InsertPublicReviewInput): Promise<PublicReviewRow>;
/** Public, visible reviews (newest first) with the author's username joined. */
export declare function listVisiblePublicReviews(limit?: number, offset?: number): Promise<PublicReviewRow[]>;
/** Every review (incl. hidden + soft-deleted) for the middleman moderation view. */
export declare function listAllPublicReviews(limit?: number, offset?: number): Promise<PublicReviewRow[]>;
export declare function getPublicReviewById(tx: TxClient, reviewId: string): Promise<PublicReviewRow | null>;
/** Count recent reviews by an author within a window (anti-spam). */
export declare function countRecentByAuthor(authorId: string, windowSeconds: number): Promise<number>;
/** Middleman edit of the review text/rating. */
export declare function updatePublicReviewContent(tx: TxClient, reviewId: string, editorId: string, fields: {
    rating: number;
    title: string | null;
    body: string;
}): Promise<void>;
/** Middleman public reply (or clearing it with null). */
export declare function setPublicReviewReply(tx: TxClient, reviewId: string, replierId: string, replyBody: string | null): Promise<void>;
export declare function setPublicReviewHidden(tx: TxClient, reviewId: string, hidden: boolean): Promise<void>;
/** Soft-delete (set deleted_at/by) or restore (null) a review. */
export declare function setPublicReviewDeleted(tx: TxClient, reviewId: string, deleterId: string, deleted: boolean): Promise<void>;
//# sourceMappingURL=public-reviews.repository.d.ts.map