/**
 * Double-entry ledger: balanced postings and fund conservation.
 * *(Requirements 17.6, 17.7, 17.8, 24.7)*
 *
 * Pure, currency-neutral integer accounting. Every money event posts one
 * `entry_group_id` group whose debits equal its credits (per coin/network).
 * A group that does not balance is rejected and the ledger is left unchanged
 * (the persistence layer validates before issuing any INSERT). All amounts are
 * `bigint` counts of the coin's smallest unit — never floating point.
 *
 * Accounting model for a deal's funds:
 *   - Deposit:   Dr hot_wallet_asset / Cr escrow_liability         (escrow now holds the funds)
 *   - Platform/settlement fee: Dr escrow_liability / Cr platform_fee_revenue
 *   - Gas (pass-through, seller-borne): Dr escrow_liability / Cr hot_wallet_asset
 *   - Seller payout / buyer refund:     Dr escrow_liability / Cr hot_wallet_asset
 * so the deal's `escrow_liability` nets to zero once fully settled and the
 * `hot_wallet_asset` retains exactly the fees backing `platform_fee_revenue`.
 *
 * Note: gas here is escrow-funded (the seller bears real network cost with no
 * markup, per Requirement 16.2), which differs from the design's representative
 * `network_fee_expense` posting used only when the platform itself absorbs gas
 * (e.g. some cause-based refunds, via `platformGasExpensePostings`).
 */
import { randomUUID } from 'node:crypto';
export class LedgerImbalanceError extends Error {
    imbalances;
    constructor(imbalances) {
        super(imbalances.length === 0
            ? 'Ledger entry group has no postings'
            : `Ledger entry group does not balance: ${imbalances
                .map((i) => `${i.coin}:${i.network} debit=${i.debit} credit=${i.credit}`)
                .join('; ')}`);
        this.name = 'LedgerImbalanceError';
        this.imbalances = imbalances;
    }
}
/** Per-(coin, network) debit/credit totals that do not net to zero. */
export function groupImbalances(postings) {
    const totals = new Map();
    for (const posting of postings) {
        if (posting.amountSmallestUnit < 0n) {
            throw new Error('Ledger posting amounts must be non-negative smallest units');
        }
        const key = `${posting.coin}:${posting.network}`;
        const current = totals.get(key) ?? {
            coin: posting.coin,
            network: posting.network,
            debit: 0n,
            credit: 0n,
        };
        if (posting.direction === 'debit') {
            current.debit += posting.amountSmallestUnit;
        }
        else {
            current.credit += posting.amountSmallestUnit;
        }
        totals.set(key, current);
    }
    const result = [];
    for (const value of totals.values()) {
        if (value.debit !== value.credit)
            result.push(value);
    }
    return result;
}
/** True when the postings net to zero per coin/network and are non-empty. */
export function isBalanced(postings) {
    return postings.length > 0 && groupImbalances(postings).length === 0;
}
/** Throw `LedgerImbalanceError` unless the group is non-empty and balanced. */
export function assertBalanced(group) {
    if (group.postings.length === 0)
        throw new LedgerImbalanceError([]);
    const imbalances = groupImbalances(group.postings);
    if (imbalances.length > 0)
        throw new LedgerImbalanceError(imbalances);
}
function pair(ctx, debit, credit, amount, reason, entryGroupId = randomUUID()) {
    const base = {
        amountSmallestUnit: amount,
        coin: ctx.coin,
        network: ctx.network,
        reason,
        dealId: ctx.dealId ?? null,
        ownerUserId: ctx.ownerUserId ?? null,
    };
    return {
        entryGroupId,
        postings: [
            { ...base, accountType: debit, direction: 'debit' },
            { ...base, accountType: credit, direction: 'credit' },
        ],
    };
}
export function depositFundedPostings(ctx, amount, id) {
    return pair(ctx, 'hot_wallet_asset', 'escrow_liability', amount, 'deposit_funded', id);
}
export function platformFeePostings(ctx, amount, id) {
    return pair(ctx, 'escrow_liability', 'platform_fee_revenue', amount, 'platform_fee', id);
}
export function settlementFeePostings(ctx, amount, id) {
    return pair(ctx, 'escrow_liability', 'platform_fee_revenue', amount, 'settlement_fee', id);
}
export function gasPassthroughPostings(ctx, amount, id) {
    return pair(ctx, 'escrow_liability', 'hot_wallet_asset', amount, 'gas_passthrough', id);
}
export function platformGasExpensePostings(ctx, amount, id) {
    return pair(ctx, 'network_fee_expense', 'hot_wallet_asset', amount, 'gas_expense', id);
}
export function sellerPayoutPostings(ctx, amount, id) {
    return pair(ctx, 'escrow_liability', 'hot_wallet_asset', amount, 'seller_payout', id);
}
export function buyerRefundPostings(ctx, amount, id) {
    return pair(ctx, 'escrow_liability', 'hot_wallet_asset', amount, 'buyer_refund', id);
}
export function coldSweepPostings(ctx, amount, id) {
    return pair(ctx, 'cold_wallet_asset', 'hot_wallet_asset', amount, 'cold_sweep', id);
}
/**
 * Verify escrowed funds are fully accounted for. *(Requirement 24.7)*
 *   escrowed === sellerRelease + platformFee + settlementFee + gas + buyerRefund
 */
export function assertEscrowConserved(amounts) {
    const out = amounts.sellerReleaseSmallestUnit +
        amounts.platformFeeSmallestUnit +
        amounts.settlementFeeSmallestUnit +
        amounts.gasSmallestUnit +
        amounts.buyerRefundSmallestUnit;
    if (out !== amounts.escrowedSmallestUnit) {
        throw new Error(`Escrow not conserved for deal ${amounts.dealId}: in=${amounts.escrowedSmallestUnit} out=${out}`);
    }
}
/**
 * Build the full set of balanced entry groups that settle a deal. Conservation
 * is asserted first; zero-amount legs are omitted. Each returned group balances
 * independently, so the whole ledger remains balanced. *(Requirements 17.6, 24.7)*
 */
export function buildSettlementGroups(amounts) {
    assertEscrowConserved(amounts);
    const ctx = { coin: amounts.coin, network: amounts.network, dealId: amounts.dealId };
    const groups = [];
    if (amounts.escrowedSmallestUnit > 0n) {
        groups.push(depositFundedPostings(ctx, amounts.escrowedSmallestUnit));
    }
    if (amounts.platformFeeSmallestUnit > 0n) {
        groups.push(platformFeePostings(ctx, amounts.platformFeeSmallestUnit));
    }
    if (amounts.settlementFeeSmallestUnit > 0n) {
        groups.push(settlementFeePostings(ctx, amounts.settlementFeeSmallestUnit));
    }
    if (amounts.gasSmallestUnit > 0n) {
        groups.push(gasPassthroughPostings(ctx, amounts.gasSmallestUnit));
    }
    if (amounts.sellerReleaseSmallestUnit > 0n) {
        groups.push(sellerPayoutPostings(ctx, amounts.sellerReleaseSmallestUnit));
    }
    if (amounts.buyerRefundSmallestUnit > 0n) {
        groups.push(buyerRefundPostings(ctx, amounts.buyerRefundSmallestUnit));
    }
    for (const group of groups)
        assertBalanced(group);
    return groups;
}
/** Net debit-minus-credit per (coin, network) across many groups. */
export function netByCoin(groups) {
    const net = new Map();
    for (const group of groups) {
        for (const posting of group.postings) {
            const key = `${posting.coin}:${posting.network}`;
            const delta = posting.direction === 'debit' ? posting.amountSmallestUnit : -posting.amountSmallestUnit;
            net.set(key, (net.get(key) ?? 0n) + delta);
        }
    }
    return net;
}
//# sourceMappingURL=ledger.js.map