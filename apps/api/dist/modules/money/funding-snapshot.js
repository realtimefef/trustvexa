// Immutable funding snapshots locked at confirm/funding time (task 5.15).
// Once built a snapshot is deeply frozen and may never change; any later write
// that disagrees with the stored snapshot is rejected. This is the data-model
// side of Property 6. (Requirements 17.9, 17.10, 21.1, 21.3)
export const FUNDING_SNAPSHOT_FIELDS = [
    'coin',
    'network',
    'dealAmount',
    'feePayer',
    'platformFee',
    'sellerSettlementFee',
    'transactionFee',
    'buyerTotal',
    'sellerPayout',
    'amountCoin',
    'amountSmallestUnit',
    'lockedFxRate',
    'fxSource',
];
export class FundingSnapshotError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FundingSnapshotError';
    }
}
export class FundingSnapshotMutationError extends Error {
    changedFields;
    constructor(changedFields) {
        super(`funding snapshot is immutable; attempted to change: ${changedFields.join(', ')}`);
        this.name = 'FundingSnapshotMutationError';
        this.changedFields = changedFields;
    }
}
/**
 * Build a validated, deeply frozen funding snapshot. The model-independent
 * conservation invariant `buyerTotal - sellerPayout === platformFee +
 * sellerSettlementFee + transactionFee` ties the snapshot to the double-entry
 * ledger regardless of who pays the fees.
 */
export function buildFundingSnapshot(input) {
    const amounts = [
        ['dealAmount', input.dealAmount],
        ['platformFee', input.platformFee],
        ['sellerSettlementFee', input.sellerSettlementFee],
        ['transactionFee', input.transactionFee],
        ['buyerTotal', input.buyerTotal],
        ['sellerPayout', input.sellerPayout],
        ['amountSmallestUnit', input.amountSmallestUnit],
    ];
    for (const [name, value] of amounts) {
        if (value < 0n)
            throw new FundingSnapshotError(`${name} must be non-negative`);
    }
    if (input.amountSmallestUnit <= 0n) {
        throw new FundingSnapshotError('amountSmallestUnit must be positive');
    }
    if (input.dealAmount <= 0n) {
        throw new FundingSnapshotError('dealAmount must be positive');
    }
    if (input.buyerTotal < input.dealAmount) {
        throw new FundingSnapshotError('buyerTotal must be at least dealAmount');
    }
    if (input.sellerPayout > input.dealAmount) {
        throw new FundingSnapshotError('sellerPayout must not exceed dealAmount');
    }
    const totalFees = input.platformFee + input.sellerSettlementFee + input.transactionFee;
    if (input.buyerTotal - input.sellerPayout !== totalFees) {
        throw new FundingSnapshotError('snapshot does not conserve funds (buyerTotal - sellerPayout != fees)');
    }
    if (!input.lockedFxRate || !input.fxSource || !input.coin || !input.network) {
        throw new FundingSnapshotError('coin, network, lockedFxRate, and fxSource are required');
    }
    const snapshot = {
        coin: input.coin,
        network: input.network,
        dealAmount: input.dealAmount,
        feePayer: input.feePayer,
        platformFee: input.platformFee,
        sellerSettlementFee: input.sellerSettlementFee,
        transactionFee: input.transactionFee,
        buyerTotal: input.buyerTotal,
        sellerPayout: input.sellerPayout,
        amountCoin: input.amountCoin,
        amountSmallestUnit: input.amountSmallestUnit,
        lockedFxRate: input.lockedFxRate,
        fxSource: input.fxSource,
    };
    return Object.freeze(snapshot);
}
/** Return the snapshot fields whose values differ between two snapshots. */
export function diffSnapshot(a, b) {
    const changed = [];
    for (const field of FUNDING_SNAPSHOT_FIELDS) {
        if (a[field] !== b[field])
            changed.push(field);
    }
    return changed;
}
/**
 * Guard a re-persist/update: the incoming snapshot must be byte-for-byte equal
 * to the stored one, otherwise the write is an illegal mutation.
 */
export function assertSnapshotImmutable(stored, incoming) {
    const changed = diffSnapshot(stored, incoming);
    if (changed.length > 0)
        throw new FundingSnapshotMutationError(changed);
}
//# sourceMappingURL=funding-snapshot.js.map