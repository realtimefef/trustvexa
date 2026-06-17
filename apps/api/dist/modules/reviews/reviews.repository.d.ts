export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface ReviewRow {
    id: string;
    deal_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string | null;
    is_hidden: boolean;
    created_at: string;
}
export interface InsertReviewInput {
    dealId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string | null;
}
export declare function insertReview(tx: TxClient, input: InsertReviewInput): Promise<ReviewRow>;
export declare function listReviewsForUser(tx: TxClient, revieweeId: string): Promise<ReviewRow[]>;
export declare function hasReviewed(tx: TxClient, dealId: string, reviewerId: string): Promise<boolean>;
export declare function setReviewHidden(tx: TxClient, reviewId: string, hidden: boolean): Promise<void>;
/** Fetch a single review by id (any visibility) for moderation. */
export declare function getReviewById(tx: TxClient, reviewId: string): Promise<ReviewRow | null>;
/** List ALL reviews about a user (including hidden) for middleman moderation. */
export declare function listAllReviewsForUser(tx: TxClient, revieweeId: string): Promise<ReviewRow[]>;
//# sourceMappingURL=reviews.repository.d.ts.map