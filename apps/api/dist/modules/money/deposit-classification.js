// Incoming-deposit classification (tasks 5.20, 5.21, 5.22).
// Every transfer is classified against the expected coin/network/amount and the
// token allowlist. Only `matched` and `overpaid` ever lead to crediting; an
// overpayment funds the expected amount and refunds the excess. Wrong
// network/coin and fake/look-alike tokens are flagged and NEVER silently
// funded (Property 12); tokens are credited only from active allowlisted
// contracts (Property 13). (Requirements 20.1-20.6)
/** Coins that are smart-contract tokens and therefore require allowlist proof. */
export const TOKEN_COINS = new Set(['USDT']);
export function isTokenCoin(coin) {
    return TOKEN_COINS.has(coin.toUpperCase());
}
/**
 * MONEY-HIGH-8 FIX: Accept tolerance in integer basis points (0–10000) to avoid
 * float→BigInt conversion errors. The previous float approach caused
 * Math.round(0.001 * 100) → 0, making sub-1% tolerance always zero.
 *
 * tolerancePct is still accepted as a number but is multiplied by 100 first to
 * yield micro-bps, then divided by the same denominator so the result is exact.
 */
function toleranceBand(expected, tolerancePct) {
    if (tolerancePct <= 0)
        return 0n;
    // Convert pct to integer micro-bps to avoid floating-point rounding.
    // e.g. 0.5% → 500 micro-bps, 0.001% → 1 micro-bps (not 0)
    const microBps = Math.round(tolerancePct * 10000);
    if (microBps <= 0)
        return 0n;
    return (expected * BigInt(microBps)) / 1000000n;
}
function contractAllowed(incoming, allowlist) {
    const addr = (incoming.tokenContractAddress ?? '').toLowerCase();
    if (!addr)
        return false;
    return allowlist.some((e) => e.isActive &&
        e.coin.toUpperCase() === incoming.coin.toUpperCase() &&
        e.network.toUpperCase() === incoming.network.toUpperCase() &&
        e.contractAddress.toLowerCase() === addr);
}
function classified(status, action, extras = {}) {
    return {
        status,
        action,
        credited: extras.credited ?? false,
        creditAmountSmallestUnit: extras.creditAmountSmallestUnit ?? 0n,
        refundExcessSmallestUnit: extras.refundExcessSmallestUnit ?? 0n,
        shortfallSmallestUnit: extras.shortfallSmallestUnit ?? 0n,
    };
}
export function classifyDeposit(expected, incoming, allowlist = []) {
    // 1. Wrong network is never funded.
    if (incoming.network.toUpperCase() !== expected.network.toUpperCase()) {
        return classified('wrong_network', 'flag_misdirected_no_fund');
    }
    // 2. Wrong coin is never funded.
    if (incoming.coin.toUpperCase() !== expected.coin.toUpperCase()) {
        return classified('wrong_coin', 'flag_misdirected_no_fund');
    }
    // 3. Token transfers must come from an active allowlisted contract.
    if (isTokenCoin(expected.coin) && !contractAllowed(incoming, allowlist)) {
        return classified('fake_token', 'reject_no_credit');
    }
    // 4. Amount classification within tolerance band.
    const band = toleranceBand(expected.amountSmallestUnit, expected.tolerancePct ?? 0);
    const delta = incoming.amountSmallestUnit - expected.amountSmallestUnit;
    if (delta < -band) {
        return classified('underpaid', 'await_topup_or_refund_minus_gas', {
            shortfallSmallestUnit: -delta,
        });
    }
    if (delta > band) {
        return classified('overpaid', 'fund_and_refund_excess', {
            credited: true,
            creditAmountSmallestUnit: expected.amountSmallestUnit,
            refundExcessSmallestUnit: delta,
        });
    }
    return classified('matched', 'fund', {
        credited: true,
        creditAmountSmallestUnit: incoming.amountSmallestUnit,
    });
}
//# sourceMappingURL=deposit-classification.js.map