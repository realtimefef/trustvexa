// Per-chain confirmation thresholds and funding decision (tasks 5.18, 5.19).
// A deposit funds a deal IF AND ONLY IF it reaches the effective confirmation
// threshold for its chain and risk tier (Property 10). Solana uses finalized
// commitment rather than a confirmation count. Reorgs can pull a credited
// deposit back below threshold. (Requirements 18.4-18.8, 45.6, 45.7)
/** Base thresholds from the spec. Solana is finalized-commitment (modeled 1). */
export function baseThreshold(chain) {
    switch (chain) {
        case 'ETH':
            return 12;
        case 'BNB':
            return 15;
        case 'TRON':
            return 20;
        case 'SOLANA':
            return 1;
    }
}
/** Larger/suspicious deals demand deeper confirmations before funding. */
export function riskMultiplier(tier) {
    switch (tier) {
        case 'normal':
            return 1;
        case 'large':
            return 2;
        case 'suspicious':
            return 3;
    }
}
export function effectiveThreshold(chain, tier = 'normal') {
    return baseThreshold(chain) * riskMultiplier(tier);
}
/**
 * The single funding predicate. For Solana, finalized commitment is required in
 * addition to meeting the (multiplied) finalized-slot count; for account/UTXO
 * chains the confirmation count must reach the effective threshold.
 */
export function meetsThreshold(state, tier = 'normal') {
    if (state.confirmations < 0)
        return false;
    const threshold = effectiveThreshold(state.chain, tier);
    if (state.chain === 'SOLANA' && state.finalized !== true)
        return false;
    return state.confirmations >= threshold;
}
export function fundingDecision(state, tier = 'normal') {
    return meetsThreshold(state, tier) ? 'fund' : 'wait';
}
/**
 * Apply a reorg of `depth` blocks to a deposit that was previously funded.
 * Confirmations cannot go below zero. If the post-reorg count no longer meets
 * the threshold, the credit must be reversed.
 */
export function applyReorg(state, depth, tier = 'normal', wasFunded = true) {
    const confirmations = Math.max(0, state.confirmations - Math.max(0, depth));
    const next = { ...state, confirmations };
    const stillFunded = meetsThreshold(next, tier);
    return { confirmations, shouldUnfund: wasFunded && !stillFunded };
}
/**
 * Idempotent crediting key. A deposit is credited at most once per
 * (tx_hash, output_index), matching the payments unique constraint.
 */
export function creditKey(txHash, outputIndex) {
    return `${txHash.toLowerCase()}:${outputIndex}`;
}
//# sourceMappingURL=confirmations.js.map