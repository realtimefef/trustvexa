/**
 * Dashboard service (task 7.1). Composes the read-side deal rows with the pure
 * action-center logic so each deal carries the prioritized "what to do next"
 * for the requesting user's role, and the deal-detail view also carries the
 * ordered activity timeline. The user's role is derived server-side from the
 * deal's party columns, never trusted from the client. (Requirements 37.4,
 * 48.5, 36.1)
 */
import { query } from '@trustvexa/shared';
import { notFound } from '../../errors/app-error.js';
import { isWaitingOn, nextActionsFor, orderTimeline } from './action-center.js';
import { getDealForUser, listDealsForUser, loadTimeline, } from './deal-read.repository.js';
/** Determine which party the user is for this deal, or `null` if none. */
function roleForUser(deal, userId) {
    if (deal.buyer_id === userId)
        return 'buyer';
    if (deal.seller_id === userId)
        return 'seller';
    if (deal.middleman_id === userId)
        return 'middleman';
    return null;
}
/** Map a timeline row's actor id to a party role (or `system` when unset). */
function actorRoleFor(row, deal) {
    if (row.actor_id === null)
        return 'system';
    if (row.actor_id === deal.buyer_id)
        return 'buyer';
    if (row.actor_id === deal.seller_id)
        return 'seller';
    if (row.actor_id === deal.middleman_id)
        return 'middleman';
    return 'system';
}
/** Normalize a pg timestamp (Date or string) to an ISO string, or `null`. */
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
function toSummary(deal, role) {
    return {
        id: deal.id,
        role,
        status: deal.status,
        coin: deal.coin,
        network: deal.network,
        networkMode: deal.network_mode,
        isPractice: deal.is_practice,
        dealAmountCents: deal.deal_amount,
        amountCoin: deal.amount_coin,
        feePayer: deal.fee_payer,
        buyerTotalCents: deal.buyer_total,
        sellerPayoutCents: deal.seller_payout,
        holdStatus: deal.hold_status,
        riskScore: deal.risk_score,
        fundBy: toIso(deal.fund_by),
        completeBy: toIso(deal.complete_by),
        inspectionUntil: toIso(deal.inspection_until),
        lastActivityAt: toIso(deal.last_activity_at),
        createdAt: toIso(deal.created_at) ?? '',
        updatedAt: toIso(deal.updated_at) ?? '',
        nextActions: nextActionsFor(role, deal.status),
        waitingOnYou: isWaitingOn(role, deal.status),
        itemDescription: deal.item_description,
    };
}
/** Buyer/seller/middleman dashboard: every deal the user is a party to. */
export async function getDashboard(userId) {
    const rows = await listDealsForUser(userId);
    const tagsRes = await query(`SELECT deal_id, label FROM deal_tags WHERE user_id = $1`, [userId]);
    const tagsMap = {};
    for (const tagRow of tagsRes.rows) {
        if (tagRow.deal_id) {
            const arr = tagsMap[tagRow.deal_id] ?? [];
            arr.push(tagRow.label);
            tagsMap[tagRow.deal_id] = arr;
        }
    }
    const deals = [];
    for (const row of rows) {
        const role = roleForUser(row, userId);
        if (role === null)
            continue;
        const summary = toSummary(row, role);
        summary.tags = tagsMap[row.id] ?? [];
        deals.push(summary);
    }
    return { deals };
}
/** Deal-detail view: full snapshot + role-filtered activity timeline. */
export async function getDealDetail(userId, dealId) {
    const row = await getDealForUser(dealId, userId);
    if (row === null) {
        // Same 404 whether the deal does not exist or the user is not a party, so
        // the endpoint never confirms the existence of someone else's deal.
        throw notFound('Deal was not found.');
    }
    const role = roleForUser(row, userId);
    if (role === null) {
        throw notFound('Deal was not found.');
    }
    const timelineRows = await loadTimeline(dealId, role === 'middleman');
    const entries = timelineRows.map((t) => ({
        at: toIso(t.created_at) ?? '',
        code: t.action,
        actorRole: actorRoleFor(t, row),
    }));
    const timeline = orderTimeline(entries);
    const tagsRes = await query(`SELECT label FROM deal_tags WHERE user_id = $1 AND deal_id = $2`, [userId, dealId]);
    const tags = tagsRes.rows.map((r) => r.label);
    return {
        ...toSummary(row, role),
        amountSmallestUnit: row.amount_smallest_unit,
        lockedFxRate: row.locked_fx_rate,
        fxSource: row.fx_source,
        priceTolerancePct: row.price_tolerance_pct,
        platformFeeCents: row.platform_fee,
        sellerSettlementFeeCents: row.seller_settlement_fee,
        transactionFeeCents: row.transaction_fee,
        legalHold: row.legal_hold,
        attemptNo: row.attempt_no,
        versionNo: row.version_no,
        timeline,
        tags,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        middlemanId: row.middleman_id,
        // Agreement progress — exposed so the UI can show "you already agreed"
        // even when the other party hasn't agreed yet (status stays 'Created').
        lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
        buyerAgreedAt: row.buyer_agreed_at ? new Date(row.buyer_agreed_at).toISOString() : null,
        sellerAgreedAt: row.seller_agreed_at ? new Date(row.seller_agreed_at).toISOString() : null,
        buyerSubmittedAt: row.buyer_submitted_at ? new Date(row.buyer_submitted_at).toISOString() : null,
        sellerSubmittedAt: row.seller_submitted_at ? new Date(row.seller_submitted_at).toISOString() : null,
        connectionId: row.connection_id ?? null,
        connectionCode: row.connection_code ?? null,
    };
}
//# sourceMappingURL=dashboard.service.js.map