/**
 * Site-wide public reviews service.
 *
 * - submitPublicReview: any signed-in user may post (light anti-spam window).
 * - listPublicReviews: public read of visible reviews.
 * - moderation (middleman only, audited in the same transaction):
 *     editPublicReview, replyToPublicReview, setHidden, deletePublicReview.
 */
import { getClient } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { appendAdminAction, } from '../admin/enforcement.repository.js';
import { countRecentByAuthor, getPublicReviewById, insertPublicReview, listAllPublicReviews, listVisiblePublicReviews, setPublicReviewDeleted, setPublicReviewHidden, setPublicReviewReply, updatePublicReviewContent, } from './public-reviews.repository.js';
/** Max reviews one author may post per hour (anti-spam). */
const MAX_REVIEWS_PER_HOUR = 5;
const SPAM_WINDOW_SECONDS = 60 * 60;
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
function toPublicView(row) {
    return {
        id: row.id,
        authorId: row.author_id,
        authorUsername: row.author_username ?? null,
        rating: row.rating,
        title: row.title,
        body: row.body,
        reply: row.reply_body,
        repliedAt: toIso(row.replied_at),
        createdAt: toIso(row.created_at),
    };
}
function toModerationView(row) {
    return {
        ...toPublicView(row),
        hidden: row.is_hidden,
        deletedAt: toIso(row.deleted_at),
    };
}
/** Any signed-in user posts a public review (rate-limited per author). */
export async function submitPublicReview(authorId, input) {
    const body = input.body.trim();
    if (body.length === 0) {
        throw new AppError('review_empty', 'Review text must not be empty.', 422);
    }
    const recent = await countRecentByAuthor(authorId, SPAM_WINDOW_SECONDS);
    if (recent >= MAX_REVIEWS_PER_HOUR) {
        throw new AppError('too_many_reviews', 'You have posted too many reviews recently. Please try again later.', 429);
    }
    const row = await insertPublicReview({
        authorId,
        rating: input.rating,
        title: input.title?.trim() ? input.title.trim() : null,
        body,
    });
    return toPublicView(row);
}
/** Public list of visible reviews with an aggregate rating. */
export async function listPublicReviews(limit = 100, offset = 0) {
    const rows = await listVisiblePublicReviews(limit, offset);
    const count = rows.length;
    const sum = rows.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
    return { reviews: rows.map(toPublicView), count, averageRating };
}
/** Middleman moderation list (includes hidden + soft-deleted). */
export async function listPublicReviewsForModeration(limit = 200, offset = 0) {
    const rows = await listAllPublicReviews(limit, offset);
    return { reviews: rows.map(toModerationView) };
}
/** Run a moderation mutation + its audit row in one transaction. */
async function withModerationTx(ctx, action, metadata, mutate) {
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const review = await getPublicReviewById(client, ctx.reviewId);
        if (review === null) {
            throw notFound('Review was not found.');
        }
        const result = await mutate(client, review);
        const auditId = await appendAdminAction(client, {
            actorId: ctx.actorId,
            action,
            targetType: 'public_review',
            targetId: ctx.reviewId,
            reason: metadata.reason ?? action,
            requestId: ctx.requestId,
            metadata,
        });
        await client.query('COMMIT');
        return { result, auditId };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Middleman edits the review content. Audited. */
export async function editPublicReview(input) {
    const body = input.body.trim();
    if (body.length === 0) {
        throw new AppError('review_empty', 'Review text must not be empty.', 422);
    }
    const { auditId } = await withModerationTx(input, 'edit_public_review', { reason: input.reason, rating: input.rating }, async (tx) => {
        await updatePublicReviewContent(tx, input.reviewId, input.actorId, {
            rating: input.rating,
            title: input.title?.trim() ? input.title.trim() : null,
            body,
        });
    });
    return { reviewId: input.reviewId, auditId };
}
/** Middleman posts (or clears) a public reply to a review. Audited. */
export async function replyToPublicReview(input) {
    const reply = input.reply?.trim() ? input.reply.trim() : null;
    const { auditId } = await withModerationTx(input, reply === null ? 'clear_public_review_reply' : 'reply_public_review', { reason: 'middleman reply' }, async (tx) => {
        await setPublicReviewReply(tx, input.reviewId, input.actorId, reply);
    });
    return { reviewId: input.reviewId, auditId };
}
/** Middleman hides/unhides a review. Audited. */
export async function setPublicReviewVisibility(input) {
    if (!input.reason?.trim()) {
        throw new AppError('reason_required', 'A reason is required to moderate a review.', 422);
    }
    const { auditId } = await withModerationTx(input, input.hidden ? 'hide_public_review' : 'unhide_public_review', { reason: input.reason }, async (tx) => {
        await setPublicReviewHidden(tx, input.reviewId, input.hidden);
    });
    return { reviewId: input.reviewId, hidden: input.hidden, auditId };
}
/** Middleman soft-deletes a review. Audited. */
export async function deletePublicReview(input) {
    if (!input.reason?.trim()) {
        throw new AppError('reason_required', 'A reason is required to delete a review.', 422);
    }
    const { auditId } = await withModerationTx(input, 'delete_public_review', { reason: input.reason }, async (tx) => {
        await setPublicReviewDeleted(tx, input.reviewId, input.actorId, true);
    });
    return { reviewId: input.reviewId, auditId };
}
//# sourceMappingURL=public-reviews.service.js.map