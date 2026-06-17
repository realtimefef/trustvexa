// Treasury reconciliation (task 7.4). Pure comparison of the internal ledger
// balance against the observed on-chain balance for a coin/network, producing a
// reconciliation status and mismatch alert. All amounts are smallest-unit
// bigints. (Requirements 45.3, 45.4)
export function reconcile(input) {
    const tolerance = input.toleranceUnits ?? 0n;
    const delta = input.onchainBalance - input.ledgerBalance;
    const absDelta = delta < 0n ? -delta : delta;
    const within = absDelta <= tolerance;
    let status;
    if (within)
        status = 'reconciled';
    else if (delta < 0n)
        status = 'shortfall';
    else
        status = 'surplus';
    return {
        coin: input.coin,
        network: input.network,
        status: within ? 'reconciled' : status === 'reconciled' ? 'mismatch' : status,
        reconciled: within,
        delta,
        mismatchAlert: !within,
    };
}
/** A shortfall (custody below ledger) is the urgent, alert-worthy case. */
export function isShortfall(result) {
    return result.status === 'shortfall';
}
//# sourceMappingURL=reconciliation.js.map