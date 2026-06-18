/**
 * Deal service — server-authoritative escrow transition (task 4.9, DB-bound).
 *
 * Ties the pure decision layer to PostgreSQL. A single transition runs inside
 * ONE database transaction:
 *   1. read the deal's current status + `version_no`;
 *   2. validate the (state, event) edge via `planTransition` (allow-list only);
 *   3. compute the next hash-chained `escrow_logs` entry;
 *   4. `UPDATE deals ... WHERE version_no = :readVersion` — 0 rows ⇒ a
 *      concurrent writer won, so abort and change nothing (Property 7);
 *   5. insert exactly one audit row (Property 9), then COMMIT.
 * Any failure rolls the whole transaction back, so the deal, version, and audit
 * log stay consistent (Property 21). (Requirements 13.2, 13.3, 17.11–17.12, 38.6)
 *
 * Idempotent replay (same Idempotency-Key ⇒ action performed once) is enforced
 * by the idempotency middleware / `idempotency_keys` table above this service.
 */
import { AppError } from '../../errors/app-error.js';
import { getRedis } from '@trustvexa/shared';
import { logger } from '../../logger.js';
import { appendEntry } from './audit-chain.js';
import { acquireClient, applyDealStatus, insertEscrowLog, loadDealVersion, loadLastEntryHash, } from './deal.repository.js';
import { DEAL_EVENTS } from './state-machine.js';
import { InvalidTransitionError, planTransition } from './transition.js';
// MONEY-CRIT-1 FIX: Import SLA timer starters so windows are set the moment
// a deal enters the state that opens each clock.
import { startFundingWindow, startCompletionClock, startInspectionWindow, } from './lifecycle-timer.service.js';
const DEAL_EVENT_SET = new Set(DEAL_EVENTS);
/**
 * Audit actor label recorded when a transition is system-initiated (lifecycle
 * timers) rather than user-driven. The hash-chained entry stores this stable
 * label, while the nullable `escrow_logs.actor_id` column is written as NULL
 * (there is no system user row to reference).
 */
const SYSTEM_ACTOR_LABEL = 'system';
/** Guard that an inbound event string is one of the defined escrow events. */
export function assertKnownEvent(event) {
    if (!DEAL_EVENT_SET.has(event)) {
        throw new AppError('invalid_event', `Unknown deal event: '${event}'.`, 422);
    }
}
/**
 * Apply a single escrow transition atomically. Resolves with the resulting
 * state and the new audit entry hash, or rejects with an `AppError`
 * (`deal_not_found`, `invalid_transition`, or `concurrent_update`).
 */
export async function applyDealTransition(input) {
    assertKnownEvent(input.event);
    const visibility = input.visibility ?? 'user';
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const current = await loadDealVersion(client, input.dealId);
        if (current === null) {
            throw new AppError('deal_not_found', `Deal '${input.dealId}' was not found.`, 404);
        }
        // Pure, server-authoritative decision; throws on an undefined edge.
        const plan = planTransition(current.status, input.event, current.version_no);
        const prevHash = await loadLastEntryHash(client, input.dealId);
        const createdAt = new Date().toISOString();
        const entry = appendEntry({
            dealId: input.dealId,
            fromState: plan.from,
            toState: plan.to,
            actorId: input.actorId ?? SYSTEM_ACTOR_LABEL,
            requestId: input.requestId,
            createdAt,
        }, prevHash);
        const updated = await applyDealStatus(client, input.dealId, plan.to, plan.readVersion, plan.nextVersion);
        if (updated === 0) {
            // A concurrent writer advanced version_no first (Property 7).
            throw new AppError('concurrent_update', 'The deal was modified concurrently; reload and retry with the latest version.', 409);
        }
        await insertEscrowLog(client, entry, input.event, visibility, input.actorId);
        let dealRow = null;
        const dealRes = await client.query(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1`, [input.dealId]);
        dealRow = dealRes.rows[0] ?? null;
        if (plan.to === 'Released') {
            const sellerId = dealRow?.seller_id;
            if (sellerId) {
                await client.query(`UPDATE users SET trust_level = LEAST(trust_level + 1, 5) WHERE id = $1`, [sellerId]);
            }
        }
        await client.query('COMMIT');
        // MONEY-CRIT-1 FIX: Wire SLA timer window starts immediately after the
        // committed state transition. Each state that opens a clock gets the matching
        // window set. Non-fatal: a timer write failure is logged but does NOT undo
        // the already-committed deal transition.
        try {
            if (plan.to === 'Confirmed') {
                await startFundingWindow(input.dealId);
            }
            else if (plan.to === 'SellerHandover') {
                await startCompletionClock(input.dealId);
            }
            else if (plan.to === 'Delivered') {
                await startInspectionWindow(input.dealId);
            }
        }
        catch (timerErr) {
            logger.error({
                dealId: input.dealId,
                toState: plan.to,
                err: timerErr instanceof Error ? timerErr.message : String(timerErr),
            }, 'SLA timer window start failed after state transition — manual intervention may be needed');
        }
        try {
            const redis = getRedis();
            await redis.publish('realtime:deal:events', JSON.stringify({
                dealId: input.dealId,
                event: 'deal:update',
                payload: { dealId: input.dealId, from: plan.from, to: plan.to },
            }));
            await redis.publish('realtime:deal:events', JSON.stringify({
                dealId: input.dealId,
                event: 'deal:state_changed',
                payload: { dealId: input.dealId, from: plan.from, to: plan.to },
            }));
        }
        catch {
            // ignore
        }
        if (dealRow) {
            let eventType = null;
            if (plan.to === 'Funded')
                eventType = 'deal.funded';
            else if (plan.to === 'Released')
                eventType = 'deal.completed';
            else if (plan.to === 'Disputed')
                eventType = 'deal.disputed';
            if (eventType) {
                const { triggerWebhook } = await import('../webhooks/webhook.service.js');
                const payload = {
                    deal_id: input.dealId,
                    from_state: plan.from,
                    to_state: plan.to,
                    event: input.event,
                    version: plan.nextVersion,
                };
                await triggerWebhook(dealRow.buyer_id, eventType, payload);
                await triggerWebhook(dealRow.seller_id, eventType, payload);
                if (dealRow.middleman_id) {
                    await triggerWebhook(dealRow.middleman_id, eventType, payload);
                }
            }
        }
        return {
            dealId: input.dealId,
            from: plan.from,
            to: plan.to,
            event: input.event,
            version: plan.nextVersion,
            entryHash: entry.entryHash,
        };
    }
    catch (err) {
        // Single best-effort rollback; ignore secondary rollback errors.
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* transaction already aborted or connection lost */
        }
        if (err instanceof InvalidTransitionError) {
            throw new AppError('invalid_transition', err.message, 409);
        }
        throw err;
    }
    finally {
        client.release();
    }
}
export async function markDealDone(userId, dealId) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal) {
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        }
        if (deal.buyer_id !== userId && deal.seller_id !== userId && deal.middleman_id !== userId) {
            throw new AppError('forbidden', 'Only a party to the deal can mark it done.', 403);
        }
        // Close all chat rooms for this deal.
        const chatRes = await client.query(`UPDATE chats SET status = 'closed' WHERE deal_id = $1 AND status = 'open' RETURNING id`, [dealId]);
        await client.query('COMMIT');
        return { dealId, chatsClosed: chatRes.rowCount ?? 0 };
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* already aborted */
        }
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Attach a middleman to a deal in one click — no invite, no verification.
 * Either the buyer or seller may request it. If a middleman is already
 * assigned, the call is idempotent. Otherwise an active middleman account
 * (other than the two parties) is auto-assigned. The buyer<->mm and seller<->mm
 * chat rooms already exist from deal creation, so chat works immediately.
 */
export async function requestMiddleman(userId, dealId) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal) {
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        }
        if (deal.buyer_id !== userId && deal.seller_id !== userId) {
            throw new AppError('forbidden', 'Only a party to the deal can request a middleman.', 403);
        }
        if (deal.middleman_id) {
            await client.query('COMMIT');
            return { dealId, middlemanId: deal.middleman_id, alreadyAssigned: true };
        }
        const mmRes = await client.query(`SELECT id FROM users
        WHERE account_type = 'middleman' AND account_status = 'active'
          AND id <> COALESCE($1, '00000000-0000-0000-0000-000000000000')
          AND id <> COALESCE($2, '00000000-0000-0000-0000-000000000000')
        ORDER BY created_at ASC
        LIMIT 1`, [deal.buyer_id, deal.seller_id]);
        const middlemanId = mmRes.rows[0]?.id;
        if (!middlemanId) {
            throw new AppError('no_middleman_available', 'No middleman is available right now. Please try again shortly.', 503);
        }
        await client.query(`UPDATE deals SET middleman_id = $2, updated_at = now() WHERE id = $1`, [
            dealId,
            middlemanId,
        ]);
        await client.query('COMMIT');
        return { dealId, middlemanId, alreadyAssigned: false };
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* already aborted */
        }
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Mark the calling party's agreement on a deal. When BOTH the buyer and seller
 * have agreed, the deal locks (immutable) and the pay step opens. Idempotent:
 * re-agreeing is a no-op. Only the deal's buyer or seller may agree.
 */
export async function agreeToDeal(userId, dealId) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT buyer_id, seller_id, buyer_agreed_at, seller_agreed_at, locked_at
         FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal) {
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        }
        // Once locked, no further agreement changes are accepted — the deal is immutable.
        if (deal.locked_at) {
            await client.query('COMMIT');
            return {
                dealId,
                buyerAgreed: deal.buyer_agreed_at !== null,
                sellerAgreed: deal.seller_agreed_at !== null,
                locked: true,
                lockedAt: typeof deal.locked_at === 'string' ? deal.locked_at : new Date(deal.locked_at).toISOString(),
            };
        }
        const isBuyer = deal.buyer_id === userId;
        const isSeller = deal.seller_id === userId;
        if (!isBuyer && !isSeller) {
            throw new AppError('forbidden', 'Only the buyer or seller can agree to this deal.', 403);
        }
        let buyerAgreedAt = deal.buyer_agreed_at;
        let sellerAgreedAt = deal.seller_agreed_at;
        if (isBuyer && !buyerAgreedAt) {
            const r = await client.query(`UPDATE deals SET buyer_agreed_at = now(), updated_at = now() WHERE id = $1
         RETURNING buyer_agreed_at`, [dealId]);
            buyerAgreedAt = r.rows[0]?.buyer_agreed_at ?? buyerAgreedAt;
        }
        if (isSeller && !sellerAgreedAt) {
            const r = await client.query(`UPDATE deals SET seller_agreed_at = now(), updated_at = now() WHERE id = $1
         RETURNING seller_agreed_at`, [dealId]);
            sellerAgreedAt = r.rows[0]?.seller_agreed_at ?? sellerAgreedAt;
        }
        let lockedAt = deal.locked_at;
        if (!lockedAt && buyerAgreedAt && sellerAgreedAt) {
            const r = await client.query(`UPDATE deals SET locked_at = now(), updated_at = now() WHERE id = $1
         RETURNING locked_at`, [dealId]);
            lockedAt = r.rows[0]?.locked_at ?? null;
        }
        await client.query('COMMIT');
        // BUGFIX: When both parties have now agreed (lockedAt just set), trigger
        // the PartiesAgreed state transition so the deal advances from
        // Created/Invited → Agreed. Without this the status never changes.
        const justLocked = !deal.locked_at && lockedAt !== null;
        if (justLocked) {
            try {
                await applyDealTransition({
                    dealId,
                    event: 'PartiesAgreed',
                    actorId: userId,
                    requestId: `agree-both-parties:${dealId}:${Date.now()}`,
                });
            }
            catch {
                // State may already be Agreed or the transition was applied concurrently.
                // Non-fatal — the lock is set, the deal advances on next reload.
            }
        }
        return {
            dealId,
            buyerAgreed: buyerAgreedAt !== null,
            sellerAgreed: sellerAgreedAt !== null,
            locked: lockedAt !== null,
            lockedAt,
        };
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* already aborted */
        }
        throw err;
    }
    finally {
        client.release();
    }
}
// MONEY-CRIT-2 FIX: 'Released' and 'Refunded' are removed from the allowed set.
// Those states must only be reached through the real payout/refund services that
// perform actual money movement, idempotency checks, and ledger entries. Allowing
// a raw override to these states would freeze funds with no on-chain resolution.
const MIDDLEMAN_ALLOWED_STATUS_OVERRIDES = new Set([
    'Cancelled',
    'Disputed',
]);
/**
 * Allow the assigned middleman to modify a deal after it has been locked.
 * Only the deal's own middleman may call this; buyer and seller cannot.
 * Runs in a single transaction so partial updates are never committed.
 */
export async function middlemanUpdateDeal(middlemanId, dealId, input) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT buyer_id, seller_id, middleman_id, status, deal_amount
         FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal) {
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        }
        if (deal.middleman_id !== middlemanId) {
            throw new AppError('forbidden', 'Only the assigned middleman can modify this deal.', 403);
        }
        // Verify the caller is actually a middleman-role user so a buyer/seller
        // who guesses this endpoint cannot masquerade.
        const callerRes = await client.query(`SELECT account_type FROM users WHERE id = $1`, [middlemanId]);
        if (callerRes.rows[0]?.account_type !== 'middleman') {
            throw new AppError('forbidden', 'Only a middleman account can use this endpoint.', 403);
        }
        let amountChanged = false;
        let termsChanged = false;
        let statusChanged = false;
        let newStatus = null;
        // Update the deal amount when provided and different.
        if (input.dealAmountCents !== undefined &&
            input.dealAmountCents !== null &&
            input.dealAmountCents !== deal.deal_amount) {
            if (input.dealAmountCents < 0) {
                throw new AppError('invalid_amount', 'Deal amount must be a non-negative integer (cents).', 422);
            }
            await client.query(`UPDATE deals SET deal_amount = $2, updated_at = now() WHERE id = $1`, [dealId, input.dealAmountCents]);
            amountChanged = true;
        }
        // Insert a new terms snapshot when provided and non-empty.
        if (input.terms !== undefined && input.terms !== null) {
            const trimmed = input.terms.trim();
            if (trimmed.length > 0) {
                // Get the next version number.
                const versionRes = await client.query(`SELECT MAX(version) AS max_version FROM deal_terms WHERE deal_id = $1`, [dealId]);
                const nextVersion = (versionRes.rows[0]?.max_version ?? 0) + 1;
                await client.query(`INSERT INTO deal_terms (deal_id, version, terms_snapshot)
           VALUES ($1, $2, $3)`, [dealId, nextVersion, trimmed]);
                termsChanged = true;
            }
        }
        // Apply a manual status override when requested.
        if (input.statusOverride !== undefined && input.statusOverride !== null) {
            if (!MIDDLEMAN_ALLOWED_STATUS_OVERRIDES.has(input.statusOverride)) {
                throw new AppError('invalid_status_override', `Status override '${input.statusOverride}' is not permitted.`, 422);
            }
            // SEC-CRIT-3 FIX: Use proper hash-chain computation via appendEntry so
            // this override entry is cryptographically linked to its predecessor.
            const note = (input.note ?? '').trim() || `Middleman override to ${input.statusOverride}`;
            const overrideReqId = `middleman-override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const overridePrevHash = await loadLastEntryHash(client, dealId);
            const overrideCreatedAt = new Date().toISOString();
            const chainEntry = appendEntry({
                dealId,
                fromState: deal.status,
                toState: input.statusOverride,
                actorId: middlemanId,
                requestId: overrideReqId,
                createdAt: overrideCreatedAt,
            }, overridePrevHash);
            await client.query(`UPDATE deals SET status = $2, updated_at = now() WHERE id = $1`, [dealId, input.statusOverride]);
            await client.query(`INSERT INTO escrow_logs
           (deal_id, action, actor_id, visibility, request_id, metadata, prev_hash, entry_hash, created_at)
         VALUES ($1, $2, $3, 'middleman_only', $4, $5::jsonb, $6, $7, $8::timestamptz)`, [
                dealId,
                'middleman_override',
                middlemanId,
                overrideReqId,
                JSON.stringify({
                    from_state: deal.status,
                    to_state: input.statusOverride,
                    note,
                }),
                chainEntry.prevHash,
                chainEntry.entryHash,
                overrideCreatedAt,
            ]);
            newStatus = input.statusOverride;
            statusChanged = true;
        }
        await client.query('COMMIT');
        return { dealId, amountChanged, termsChanged, statusChanged, newStatus };
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* already aborted */
        }
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Middleman confirms that the seller has completed the handover.
 * Transitions the deal from SellerHandover → MiddlemanVerified.
 * Only the deal's assigned middleman account may call this.
 */
export async function verifyHandover(middlemanId, dealId, requestId) {
    // Verify the caller is the assigned middleman on this deal.
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal) {
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        }
        if (deal.middleman_id !== middlemanId) {
            throw new AppError('forbidden', 'Only the assigned middleman can verify the handover.', 403);
        }
        if (deal.status !== 'SellerHandover') {
            throw new AppError('invalid_transition', `Cannot verify handover: deal is in '${deal.status}' state, expected 'SellerHandover'.`, 422);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch { /* ignore */ }
        throw err;
    }
    finally {
        client.release();
    }
    const result = await applyDealTransition({
        dealId,
        event: 'MiddlemanVerifiedTransfer',
        actorId: middlemanId,
        requestId,
    });
    return { dealId, status: result.to };
}
/**
 * Middleman confirms delivery to the buyer.
 * Transitions MiddlemanVerified → Delivered.
 * Only the deal's assigned middleman account may call this.
 */
export async function deliverToBuyer(middlemanId, dealId, requestId) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal)
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        if (deal.middleman_id !== middlemanId)
            throw new AppError('forbidden', 'Only the assigned middleman can deliver to the buyer.', 403);
        if (deal.status !== 'MiddlemanVerified')
            throw new AppError('invalid_transition', `Cannot deliver: deal is in '${deal.status}', expected 'MiddlemanVerified'.`, 422);
        await client.query('COMMIT');
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch { /* ignore */ }
        throw err;
    }
    finally {
        client.release();
    }
    const result = await applyDealTransition({
        dealId,
        event: 'DeliveredToBuyer',
        actorId: middlemanId,
        requestId,
    });
    return { dealId, status: result.to };
}
/**
 * Buyer approves the delivery, releasing funds.
 * Transitions Delivered → Approved.
 * Only the deal's buyer may call this.
 */
export async function approveDeal(buyerId, dealId, requestId) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const dealRes = await client.query(`SELECT buyer_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
        const deal = dealRes.rows[0];
        if (!deal)
            throw new AppError('deal_not_found', 'Deal was not found.', 404);
        if (deal.buyer_id !== buyerId)
            throw new AppError('forbidden', 'Only the buyer can approve the delivery.', 403);
        if (deal.status !== 'Delivered')
            throw new AppError('invalid_transition', `Cannot approve: deal is in '${deal.status}', expected 'Delivered'.`, 422);
        await client.query('COMMIT');
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch { /* ignore */ }
        throw err;
    }
    finally {
        client.release();
    }
    const result = await applyDealTransition({
        dealId,
        event: 'BuyerApproved',
        actorId: buyerId,
        requestId,
    });
    return { dealId, status: result.to };
}
export async function updateDealTags(userId, dealId, tags) {
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        // 1. Verify user is a party of the deal
        const dealCheck = await client.query(`SELECT 1 FROM deals
        WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR middleman_id = $2)
        LIMIT 1`, [dealId, userId]);
        if (dealCheck.rows.length === 0) {
            throw new AppError('deal_not_found', 'Deal was not found or you are not a party to it.', 404);
        }
        // 2. Delete existing tags
        await client.query(`DELETE FROM deal_tags WHERE user_id = $1 AND deal_id = $2`, [
            userId,
            dealId,
        ]);
        // 3. Insert new tags
        for (const tag of tags) {
            await client.query(`INSERT INTO deal_tags (user_id, deal_id, label)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, deal_id, label) DO NOTHING`, [userId, dealId, tag]);
        }
        await client.query('COMMIT');
    }
    catch (err) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            // Rollback failure is logged by the DB driver; the original error is re-thrown below.
        }
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=deal.service.js.map