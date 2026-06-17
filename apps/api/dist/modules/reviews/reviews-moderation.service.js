/**
 * Middleman review moderation (Plan §9 "Moderated"; Requirement 25.4).
 *
 * The middleman can hide abusive or unsafe reviews and unhide them again.
 * Hidden reviews are excluded from the public read path (`is_hidden = false`),
 * so hiding a review immediately removes it from a user's public reputation.
 * Every moderation action requires a reason and writes a hash-chained
 * `admin_actions` audit row in the SAME transaction as the visibility change,
 * so it is accountable and tamper-evident — mirroring the enforcement service.
 */
import { getClient } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { appendAdminAction, } from '../admin/enforcement.repository.js';
import { getReviewById, listAllReviewsForUser, setReviewHidden, } from './reviews.repository.js';
function toIso(value) {
    return value instanceof Date ? value.toISOString() : String(value);
}
function toView(row) {
    return {
        id: row.id,
        dealId: row.deal_id,
        reviewerId: row.reviewer_id,
        revieweeId: row.reviewee_id,
        rating: row.rating,
        comment: row.comment,
        hidden: row.is_hidden,
        createdAt: toIso(row.created_at),
    };
}
/** List every review about a user (including hidden) for the moderation view. */
export async function listReviewsForModeration(revieweeId) {
    const client = (await getClient());
    try {
        const rows = await listAllReviewsForUser(client, revieweeId);
        return { revieweeId, reviews: rows.map(toView) };
    }
    finally {
        client.release();
    }
}
/**
 * Hide or unhide a review as the middleman. Requires a reason. The visibility
 * change and its audit row commit together or not at all. Idempotent: setting
 * the same visibility again simply re-affirms it (and is still audited).
 */
export async function moderateReview(input) {
    const reason = input.reason?.trim();
    if (!reason) {
        throw new AppError('reason_required', 'A reason is required to moderate a review.', 422);
    }
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const review = await getReviewById(client, input.reviewId);
        if (review === null) {
            throw notFound('Review was not found.');
        }
        await setReviewHidden(client, input.reviewId, input.hidden);
        const auditId = await appendAdminAction(client, {
            actorId: input.actorId,
            action: input.hidden ? 'hide_review' : 'unhide_review',
            targetType: 'review',
            targetId: input.reviewId,
            reason,
            requestId: input.requestId,
            metadata: { revieweeId: review.reviewee_id, from: review.is_hidden, to: input.hidden },
        });
        await client.query('COMMIT');
        return { reviewId: input.reviewId, hidden: input.hidden, auditId };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=reviews-moderation.service.js.map