export interface SubmitFeedbackInput {
    rating: number;
    message?: string;
    category?: string;
}
export interface FeedbackRow {
    id: string;
    user_id: string;
    score: number;
    comment_enc: string | null;
    created_at: Date;
}
export declare function submitFeedback(userId: string, input: SubmitFeedbackInput): Promise<FeedbackRow>;
//# sourceMappingURL=feedback.service.d.ts.map