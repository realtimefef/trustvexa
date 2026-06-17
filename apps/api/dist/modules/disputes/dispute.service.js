/**
 * Dispute read service (task 7.5). Returns the dispute for a deal together with
 * its locked evidence metadata and thread states, but only to a party of that
 * deal (buyer, seller, or assigned middleman). The same 404 is returned whether
 * the deal/dispute does not exist or the caller is not a party, so the endpoint
 * never confirms the existence of someone else's dispute. (Requirements 24.x)
 */
import { AppError, notFound } from '../../errors/app-error.js';
import { getRedis } from '@trustvexa/shared';
import { generateDocumentNumber } from '../deal/agreement.js';
import { appendEntry } from '../deal/audit-chain.js';
import { applyDealStatus, insertEscrowLog, loadLastEntryHash } from '../deal/deal.repository.js';
import { InvalidTransitionError, planTransition } from '../deal/transition.js';
import { runMoneyWrite, lockDealVersion } from '../money/money-write.js';
import { computeSettlement, SettlementValidationError, } from './dispute-resolution.js';
import { insertSettlement, lockDealForSettlement } from './dispute-write.repository.js';
import { appendThreadMessage, lockDisputeThreads, openDispute, resolveDispute as resolveDisputeRow, } from './dispute.repository.js';
import { createThread, getOpenThreadId } from './dispute-thread.repository.js';
import { insertLockedEvidence } from './evidence.repository.js';
import { getDealAccess, getDisputeAccess, getDisputeByDeal, listEvidence, listThreadMessages, listThreads, } from './dispute-read.repository.js';
import { generateSignedLink } from '../storage/signed-links.js';
function roleForUser(deal, userId) {
    if (deal.buyer_id === userId)
        return 'buyer';
    if (deal.seller_id === userId)
        return 'seller';
    if (deal.middleman_id === userId)
        return 'middleman';
    return null;
}
function roleForDispute(access, userId) {
    if (access.buyer_id === userId)
        return 'buyer';
    if (access.seller_id === userId)
        return 'seller';
    if (access.middleman_id === userId)
        return 'middleman';
    return null;
}
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function getDisputeForUser(userId, dealId) {
    const access = await getDealAccess(dealId);
    const role = access ? roleForUser(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Dispute was not found.');
    }
    const dispute = await getDisputeByDeal(dealId);
    if (dispute === null) {
        throw notFound('Dispute was not found.');
    }
    const [evidence, threads] = await Promise.all([
        listEvidence(dispute.id),
        listThreads(dispute.id),
    ]);
    return {
        role,
        id: dispute.id,
        dealId: dispute.deal_id,
        reason: dispute.reason,
        status: dispute.status,
        resolution: dispute.resolution,
        decisionNote: dispute.final_decision_note,
        resolvedAt: toIso(dispute.resolved_at),
        createdAt: toIso(dispute.created_at),
        evidence: evidence.map((e) => {
            const { url } = generateSignedLink(e.id, userId);
            return {
                id: e.id,
                fileHash: e.file_hash,
                mimeType: e.mime_type,
                reviewStatus: e.review_status,
                locked: e.locked_at !== null,
                url,
                createdAt: toIso(e.created_at),
            };
        }),
        threads: threads.map((t) => ({
            id: t.id,
            status: t.status,
            locked: t.status === 'locked' || t.locked_at !== null,
            createdAt: toIso(t.created_at),
        })),
    };
}
// ── Dispute resolution (middleman, money-moving) ──────────────────────────
const OUTCOME_TO_STATUS = {
    full_refund: 'Refunded',
    full_release: 'Released',
    partial_split: 'PartiallySettled',
};
/**
 * Resolve a deal's open dispute as the assigned middleman. Runs through the
 * money-write contract so it is idempotent (Idempotency-Key), optimistically
 * locked (deal version), and atomic: the settlement record, the dispute
 * resolution, the thread lock, and the deal-state transition all commit
 * together. The exact split is computed by the pure, tested settlement math and
 * always balances (toBuyer + toSeller === escrow). (Requirements 24.1-24.7)
 */
export async function resolveDisputeForMiddleman(input) {
    const { outcome } = input;
    const docNumber = generateDocumentNumber(input.dealId);
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'resolve_dispute',
        userId: input.middlemanId,
        dealId: input.dealId,
        payload: {
            dealId: input.dealId,
            outcome,
            reason: input.reason,
            buyerShareSmallestUnit: input.buyerShareSmallestUnit ?? null,
        },
        work: async (client) => {
            const deal = await lockDealForSettlement(client, input.dealId);
            if (deal === null)
                throw notFound('Deal was not found.');
            if (deal.middleman_id !== input.middlemanId) {
                throw new AppError('forbidden', 'Only the assigned middleman can resolve this dispute.', 403);
            }
            if (deal.status !== 'Disputed') {
                throw new AppError('not_disputed', 'This deal is not in a disputed state.', 409);
            }
            const disputeRes = await client.query(`SELECT id, status FROM disputes
          WHERE deal_id = $1 AND status IN ('open', 'under_review')
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [input.dealId]);
            const dispute = disputeRes.rows[0];
            if (!dispute) {
                throw new AppError('no_open_dispute', 'There is no open dispute to resolve.', 409);
            }
            const escrow = BigInt(deal.amount_smallest_unit ?? '0');
            let split;
            try {
                split = computeSettlement(input.buyerShareSmallestUnit !== undefined
                    ? { escrowAmount: escrow, outcome, buyerShare: BigInt(input.buyerShareSmallestUnit) }
                    : { escrowAmount: escrow, outcome });
            }
            catch (err) {
                if (err instanceof SettlementValidationError) {
                    throw new AppError('settlement_invalid', `Invalid settlement: ${err.reason}.`, 422);
                }
                throw err;
            }
            // Optimistic lock: bump the deal version (aborts on concurrent writer).
            await lockDealVersion(client, input.dealId, deal.version_no);
            await insertSettlement(client, {
                dealId: input.dealId,
                type: outcome,
                buyerRefundSmallestUnit: split.toBuyer,
                sellerReleaseSmallestUnit: split.toSeller,
                reason: input.reason,
                decidedBy: input.middlemanId,
            });
            await resolveDisputeRow(client, {
                disputeId: dispute.id,
                resolution: outcome,
                decisionNote: input.reason,
                decisionPdfKey: docNumber,
            });
            await lockDisputeThreads(client, dispute.id);
            const toState = OUTCOME_TO_STATUS[outcome];
            await client.query(`UPDATE deals SET status = $2::deal_status, last_activity_at = now()
          WHERE id = $1 AND status = 'Disputed'`, [input.dealId, toState]);
            return {
                outcome,
                toState,
                toBuyerSmallestUnit: split.toBuyer.toString(),
                toSellerSmallestUnit: split.toSeller.toString(),
                decisionDocumentNumber: docNumber,
            };
        },
    });
    try {
        const redis = getRedis();
        await redis.publish('realtime:deal:events', JSON.stringify({
            dealId: input.dealId,
            event: 'deal:update',
            payload: { dealId: input.dealId },
        }));
        await redis.publish('realtime:deal:events', JSON.stringify({
            dealId: input.dealId,
            event: 'deal:state_changed',
            payload: { dealId: input.dealId },
        }));
    }
    catch {
        // ignore
    }
    return result;
}
/**
 * Open a dispute on a Funded or Delivered deal as one of its parties
 * (buyer/seller). Runs through the money-write contract so it is idempotent
 * (Idempotency-Key) and atomic: the `ProblemRaised` escrow transition (with its
 * optimistic-lock version bump and hash-chained `escrow_logs` audit row), the
 * `disputes` row, and the initial open `dispute_threads` row all commit
 * together. The transition is decided by the same server-authoritative state
 * machine as every other escrow change, so opening from any state other than
 * Funded/Delivered is rejected. (Requirement 24.1)
 */
export async function openDisputeForParty(input) {
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'open_dispute',
        userId: input.userId,
        dealId: input.dealId,
        payload: { dealId: input.dealId, category: input.category, statement: input.statement ?? null },
        work: async (client) => {
            const deal = await lockDealForSettlement(client, input.dealId);
            if (deal === null)
                throw notFound('Deal was not found.');
            // Only a party may open, and the middleman is not a disputing party.
            if (deal.buyer_id !== input.userId && deal.seller_id !== input.userId) {
                if (deal.middleman_id === input.userId) {
                    throw new AppError('forbidden', 'Only the buyer or seller can open a dispute on this deal.', 403);
                }
                // Opaque: a non-party must not learn the deal exists.
                throw notFound('Deal was not found.');
            }
            const role = deal.buyer_id === input.userId ? 'buyer' : 'seller';
            // If the deal has no middleman assigned, assign one (pre-selected or auto-assigned)
            if (!deal.middleman_id) {
                let assignedMiddlemanId = null;
                if (deal.preferred_middleman_id) {
                    const prefRes = await client.query(`SELECT id FROM users WHERE id = $1 AND account_type = 'middleman' AND account_status = 'active'`, [deal.preferred_middleman_id]);
                    if (prefRes.rows[0]) {
                        assignedMiddlemanId = deal.preferred_middleman_id;
                    }
                }
                if (!assignedMiddlemanId) {
                    const midRes = await client.query(`SELECT u.id
             FROM users u
             LEFT JOIN deals dl ON dl.middleman_id = u.id
             LEFT JOIN disputes disp ON disp.deal_id = dl.id AND disp.status IN ('open', 'under_review')
             WHERE u.account_type = 'middleman' AND u.account_status = 'active'
             GROUP BY u.id
             ORDER BY COUNT(disp.id) ASC, gen_random_uuid()
             LIMIT 1`);
                    if (midRes.rows[0]) {
                        assignedMiddlemanId = midRes.rows[0].id;
                    }
                }
                if (assignedMiddlemanId) {
                    await client.query(`UPDATE deals SET middleman_id = $1 WHERE id = $2`, [
                        assignedMiddlemanId,
                        input.dealId,
                    ]);
                    deal.middleman_id = assignedMiddlemanId;
                }
            }
            // Server-authoritative transition: Funded/Delivered --ProblemRaised--> Disputed.
            let plan;
            try {
                plan = planTransition(deal.status, 'ProblemRaised', deal.version_no);
            }
            catch (err) {
                if (err instanceof InvalidTransitionError) {
                    throw new AppError('invalid_state', 'A dispute can only be opened on a funded or delivered deal.', 409);
                }
                throw err;
            }
            const prevHash = await loadLastEntryHash(client, input.dealId);
            const createdAt = new Date().toISOString();
            const entry = appendEntry({
                dealId: input.dealId,
                fromState: plan.from,
                toState: plan.to,
                actorId: input.userId,
                requestId: input.requestId,
                createdAt,
            }, prevHash);
            const updated = await applyDealStatus(client, input.dealId, plan.to, plan.readVersion, plan.nextVersion);
            if (updated === 0) {
                throw new AppError('concurrent_update', 'The deal was modified concurrently; reload and retry with the latest version.', 409);
            }
            await insertEscrowLog(client, entry, 'ProblemRaised', 'user', input.userId);
            const dispute = await openDispute(client, {
                dealId: input.dealId,
                raisedBy: input.userId,
                reason: input.category,
            });
            const thread = await createThread(client, dispute.id);
            if (input.statement !== undefined) {
                await appendThreadMessage(client, {
                    threadId: thread.id,
                    senderId: input.userId,
                    bodyEnc: input.statement,
                    role,
                });
            }
            return {
                disputeId: dispute.id,
                dealId: input.dealId,
                threadId: thread.id,
                category: input.category,
                fromState: plan.from,
                toState: plan.to,
            };
        },
    });
    try {
        const redis = getRedis();
        await redis.publish('realtime:deal:events', JSON.stringify({
            dealId: input.dealId,
            event: 'deal:update',
            payload: { dealId: input.dealId },
        }));
        await redis.publish('realtime:deal:events', JSON.stringify({
            dealId: input.dealId,
            event: 'deal:state_changed',
            payload: { dealId: input.dealId },
        }));
    }
    catch {
        // ignore
    }
    return result;
}
/**
 * List a dispute's thread messages for a caller who is a party to the deal
 * (buyer/seller) or the assigned middleman. Non-parties get the same opaque 404
 * as a missing dispute. (Requirement 24.2)
 */
export async function listDisputeMessagesForUser(userId, disputeId) {
    const access = await getDisputeAccess(disputeId);
    const role = access ? roleForDispute(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Dispute was not found.');
    }
    const rows = await listThreadMessages(disputeId);
    return {
        disputeId,
        role,
        messages: rows.map((m) => ({
            id: m.id,
            threadId: m.thread_id,
            senderId: m.sender_id,
            role: m.role,
            body: m.body_enc,
            createdAt: toIso(m.created_at),
        })),
    };
}
/**
 * Post a statement to a dispute thread as a party or the assigned middleman.
 * Idempotent via the money-write contract; the insert is gated on the thread
 * still being `open`, so once a dispute resolves (threads locked) no further
 * statements are accepted. (Requirement 24.2)
 */
export async function postDisputeMessageForUser(input) {
    const access = await getDisputeAccess(input.disputeId);
    const role = access ? roleForDispute(access, input.userId) : null;
    if (!access || role === null) {
        throw notFound('Dispute was not found.');
    }
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'post_dispute_message',
        userId: input.userId,
        dealId: access.deal_id,
        payload: { disputeId: input.disputeId, body: input.body },
        work: async (client) => {
            const threadId = await getOpenThreadId(client, input.disputeId);
            if (threadId === null) {
                throw new AppError('thread_locked', 'This dispute thread is locked.', 409);
            }
            // body_enc holds the statement as-is (plaintext for now; named for the
            // future KeyProvider-encrypted blob, consistent with chat messages).
            const messageId = await appendThreadMessage(client, {
                threadId,
                senderId: input.userId,
                bodyEnc: input.body,
                role,
            });
            return { messageId, disputeId: input.disputeId, role };
        },
    });
    return result;
}
/**
 * Register an evidence record for a dispute. Evidence is hashed and locked at
 * upload (`locked_at`), so the row is immutable once created. Idempotent via
 * the money-write contract. (Requirement 24.3)
 */
export async function registerDisputeEvidenceForUser(input) {
    const access = await getDisputeAccess(input.disputeId);
    const role = access ? roleForDispute(access, input.userId) : null;
    if (!access || role === null) {
        throw notFound('Dispute was not found.');
    }
    if (access.dispute_status !== 'open' && access.dispute_status !== 'under_review') {
        throw new AppError('dispute_closed', 'Evidence cannot be added to a closed dispute.', 409);
    }
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'register_dispute_evidence',
        userId: input.userId,
        dealId: access.deal_id,
        payload: {
            disputeId: input.disputeId,
            fileKey: input.fileKey,
            fileHash: input.fileHash,
            mimeType: input.mimeType,
        },
        work: async (client) => {
            const row = await insertLockedEvidence(client, {
                disputeId: input.disputeId,
                fileKey: input.fileKey,
                fileHash: input.fileHash,
                mimeType: input.mimeType,
                uploadedBy: input.userId,
            });
            return {
                evidenceId: row.id,
                disputeId: input.disputeId,
                fileHash: row.file_hash,
                mimeType: row.mime_type,
                locked: row.locked_at !== null,
            };
        },
    });
    return result;
}
//# sourceMappingURL=dispute.service.js.map