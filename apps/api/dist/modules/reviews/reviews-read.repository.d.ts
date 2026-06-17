export interface PublicReviewRow {
    id: string;
    deal_id: string;
    rating: number;
    comment: string | null;
    created_at: Date | string;
}
export declare function listPublicReviews(revieweeId: string): Promise<PublicReviewRow[]>;
export declare function countMissedDeadlines(userId: string): Promise<number>;
//# sourceMappingURL=reviews-read.repository.d.ts.map