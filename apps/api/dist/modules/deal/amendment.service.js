/**
 * Amendments and mutual cancellation (task 4.8, Requirement 12).
 *
 *  - requestAmendment: a buyer/seller proposes a change on a Confirmed deal and
 *    implicitly approves their own side (12.1).
 *  - decideAmendment: the counterparty (and middleman for money/product
 *    changes, 12.2) approves or refuses; a refusal escalates to the middleman
 *    (12.5); full approval advances Confirmed -> Amended via the deal service
 *    so the change obeys the allow-list, locking, and audit rules. The full
 *    amendment history is retained (12.3).
 *  - requestCancellation / decideCancellation: mutual pre-funding cancellation
 *    with no penalty (12.4); a refusal escalates to the middleman (12.5);
 *    once funded the request is routed to the refund/dispute flow (12.6).
 *
 * Database writes for a single decision run in one transaction; the escrow
 * state transition is applied afterwards through `applyDealTransition`, which
 * owns its own transaction (so no nesting).
 */
import { AppError } from '../../errors/app-error.js';
import { isAmendmentFullyApproved, isCancellationMutuallyApproved, isFundedActive, requiresMiddlemanApproval, } from './amendment.js';
import * as amendRepo from './amendment.repository.js';
import { acquireClient } from './deal.repository.js';
import { applyDealTransition } from './deal.service.js';
function roleForUser(deal, userId) {
    if (deal.buyer_id === userId) {
        return 'buyer';
    }
    if (deal.seller_id === userId) {
        return 'seller';
    }
    if (deal.middleman_id === userId) {
        return 'middleman';
    }
    throw new AppError('not_deal_participant', 'You are not a participant in this deal.', 403);
}
function partyRoleForUser(deal, userId) {
    const role = roleForUser(deal, userId);
    if (role === 'middleman') {
        throw new AppError('middleman_cannot_request', 'The middleman cannot originate a change request or cancellation.', 403);
    }
    return role;
}
async function loadDealOr404(dealId) {
    const deal = await amendRepo.loadDealForAmendment(dealId);
    if (deal === null) {
        throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    return deal;
}
export async function requestAmendment(args) {
    const deal = await loadDealOr404(args.dealId);
    const role = partyRoleForUser(deal, args.userId);
    if (deal.status !== 'Confirmed') {
        throw new AppError('amendment_not_allowed', `Amendments can be requested only on a Confirmed deal (currently ${deal.status}).`, 409);
    }
    const needsMiddleman = requiresMiddlemanApproval(args.input.changeType);
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const { id } = await amendRepo.insertAmendment(client, {
            dealId: args.dealId,
            requestedBy: args.userId,
            changeType: args.input.changeType,
            oldValue: args.input.oldValue ?? null,
            newValue: args.input.newValue,
        });
        // The requester implicitly approves their own side (12.1).
        await amendRepo.approveAmendmentRole(client, id, role);
        await client.query('COMMIT');
        return {
            amendmentId: id,
            status: 'pending',
            changeType: args.input.changeType,
            requiresMiddleman: needsMiddleman,
            requesterRole: role,
        };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function decideAmendment(args) {
    const deal = await loadDealOr404(args.dealId);
    const role = roleForUser(deal, args.userId);
    let becameFullyApproved = false;
    let resultStatus = 'pending';
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const amendment = await amendRepo.getAmendmentForUpdate(client, args.dealId, args.amendmentId);
        if (amendment === null) {
            throw new AppError('amendment_not_found', 'Amendment was not found.', 404);
        }
        if (amendment.status !== 'pending') {
            throw new AppError('amendment_not_actionable', `Amendment is '${amendment.status ?? 'unknown'}' and can no longer be decided.`, 409);
        }
        if (args.input.decision === 'reject') {
            // 12.5: a refusal routes the change request to the middleman.
            await amendRepo.setAmendmentStatus(client, args.amendmentId, 'escalated');
            resultStatus = 'escalated';
            await client.query('COMMIT');
            return { amendmentId: args.amendmentId, status: resultStatus, routedToMiddleman: true };
        }
        await amendRepo.approveAmendmentRole(client, args.amendmentId, role);
        const updated = await amendRepo.getAmendmentForUpdate(client, args.dealId, args.amendmentId);
        const needsMiddleman = requiresMiddlemanApproval(updated?.change_type ?? 'other');
        becameFullyApproved = isAmendmentFullyApproved({
            buyerApprovedAt: updated?.buyer_approved_at ?? null,
            sellerApprovedAt: updated?.seller_approved_at ?? null,
            middlemanApprovedAt: updated?.middleman_approved_at ?? null,
        }, needsMiddleman);
        if (becameFullyApproved) {
            await amendRepo.setAmendmentStatus(client, args.amendmentId, 'approved');
            resultStatus = 'approved';
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
    // Apply the escrow transition outside the approval transaction so it runs
    // through the audited, optimistically-locked deal service.
    let dealStatus = deal.status;
    if (becameFullyApproved) {
        const transition = await applyDealTransition({
            dealId: args.dealId,
            event: 'ChangeRequestApproved',
            actorId: args.userId,
            requestId: `${args.dealId}:amend:${args.amendmentId}`,
        });
        dealStatus = transition.to;
    }
    return { amendmentId: args.amendmentId, status: resultStatus, dealStatus };
}
export async function listAmendments(args) {
    const deal = await loadDealOr404(args.dealId);
    roleForUser(deal, args.userId);
    const rows = await amendRepo.listAmendments(args.dealId);
    return { amendments: rows };
}
export async function requestCancellation(args) {
    const deal = await loadDealOr404(args.dealId);
    const role = partyRoleForUser(deal, args.userId);
    // 12.6: once funds are held, cancellation is handled by refund/dispute.
    if (isFundedActive(deal.status)) {
        const client = await acquireClient();
        try {
            await client.query('BEGIN');
            const { id } = await amendRepo.insertCancellation(client, {
                dealId: args.dealId,
                requestedBy: args.userId,
                reason: args.input.reason ?? null,
                status: 'routed_to_dispute',
            });
            await client.query('COMMIT');
            return {
                cancellationId: id,
                status: 'routed_to_dispute',
                routedToDispute: true,
                requesterRole: role,
            };
        }
        catch (err) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw err;
        }
        finally {
            client.release();
        }
    }
    // 12.4: mutual pre-funding cancellation is defined only on a Confirmed deal.
    if (deal.status !== 'Confirmed') {
        throw new AppError('cancellation_not_allowed', `Mutual cancellation applies only to a Confirmed (pre-funding) deal (currently ${deal.status}).`, 409);
    }
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const { id } = await amendRepo.insertCancellation(client, {
            dealId: args.dealId,
            requestedBy: args.userId,
            reason: args.input.reason ?? null,
            status: 'pending',
        });
        await amendRepo.approveCancellationRole(client, id, role);
        await client.query('COMMIT');
        return { cancellationId: id, status: 'pending', requesterRole: role };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function decideCancellation(args) {
    const deal = await loadDealOr404(args.dealId);
    const role = roleForUser(deal, args.userId);
    if (role === 'middleman') {
        throw new AppError('use_middleman_decision', 'The middleman must use the middleman-decision endpoint for escalated cancellations.', 403);
    }
    let becameCancelled = false;
    let resultStatus = 'pending';
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const cancellation = await amendRepo.getCancellationForUpdate(client, args.dealId, args.cancellationId);
        if (cancellation === null) {
            throw new AppError('cancellation_not_found', 'Cancellation was not found.', 404);
        }
        if (cancellation.status !== 'pending') {
            throw new AppError('cancellation_not_actionable', `Cancellation is '${cancellation.status ?? 'unknown'}' and can no longer be decided.`, 409);
        }
        if (args.input.decision === 'reject') {
            await amendRepo.setCancellationStatus(client, args.cancellationId, 'escalated');
            resultStatus = 'escalated';
            await client.query('COMMIT');
            return { cancellationId: args.cancellationId, status: resultStatus, routedToMiddleman: true };
        }
        await amendRepo.approveCancellationRole(client, args.cancellationId, role);
        const updated = await amendRepo.getCancellationForUpdate(client, args.dealId, args.cancellationId);
        becameCancelled = isCancellationMutuallyApproved({
            buyerApprovedAt: updated?.buyer_approved_at ?? null,
            sellerApprovedAt: updated?.seller_approved_at ?? null,
        });
        if (becameCancelled) {
            await amendRepo.setCancellationStatus(client, args.cancellationId, 'cancelled');
            resultStatus = 'cancelled';
        }
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
    let dealStatus = deal.status;
    if (becameCancelled) {
        const transition = await applyDealTransition({
            dealId: args.dealId,
            event: 'MutualCancellation',
            actorId: args.userId,
            requestId: `${args.dealId}:cancel:${args.cancellationId}`,
        });
        dealStatus = transition.to;
    }
    return { cancellationId: args.cancellationId, status: resultStatus, dealStatus };
}
export async function decideCancellationAsMiddleman(args) {
    const deal = await loadDealOr404(args.dealId);
    const role = roleForUser(deal, args.userId);
    if (role !== 'middleman') {
        throw new AppError('not_middleman', 'Only the assigned middleman can decide an escalated cancellation.', 403);
    }
    let becameCancelled = false;
    let resultStatus;
    const decisionText = args.input.note
        ? `${args.input.decision}: ${args.input.note}`
        : args.input.decision;
    const client = await acquireClient();
    try {
        await client.query('BEGIN');
        const cancellation = await amendRepo.getCancellationForUpdate(client, args.dealId, args.cancellationId);
        if (cancellation === null) {
            throw new AppError('cancellation_not_found', 'Cancellation was not found.', 404);
        }
        if (cancellation.status !== 'escalated') {
            throw new AppError('cancellation_not_escalated', `Only an escalated cancellation can be decided by the middleman (currently '${cancellation.status ?? 'unknown'}').`, 409);
        }
        resultStatus = args.input.decision === 'approve' ? 'cancelled' : 'rejected';
        becameCancelled = args.input.decision === 'approve';
        await amendRepo.setCancellationMiddlemanDecision(client, args.cancellationId, decisionText, resultStatus);
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
    let dealStatus = deal.status;
    if (becameCancelled && deal.status === 'Confirmed') {
        const transition = await applyDealTransition({
            dealId: args.dealId,
            event: 'MutualCancellation',
            actorId: args.userId,
            requestId: `${args.dealId}:cancel:${args.cancellationId}:mm`,
        });
        dealStatus = transition.to;
    }
    return { cancellationId: args.cancellationId, status: resultStatus, dealStatus };
}
export async function listCancellations(args) {
    const deal = await loadDealOr404(args.dealId);
    roleForUser(deal, args.userId);
    const rows = await amendRepo.listCancellations(args.dealId);
    return { cancellations: rows };
}
//# sourceMappingURL=amendment.service.js.map