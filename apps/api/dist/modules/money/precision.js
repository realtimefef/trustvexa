/**
 * Integer smallest-unit money primitives. *(Requirements 17.1, 17.2)*
 *
 * Every coin/token amount is stored and computed as an integer count of the
 * coin's smallest unit (`bigint`). No floating-point arithmetic is ever used
 * for money. USD figures used for fee tiering are integer cents (see
 * `fee-engine.ts`). Decimals mirror `money_precision_rules`
 * (packages/db/seeds/seed_reference_data.js); callers may also pass a
 * rules table loaded from the database.
 */
/**
 * Server-held precision table mirroring the seeded `money_precision_rules`
 * rows. Used when no database-loaded table is supplied. Never trust a
 * client-supplied decimals value for ledger math.
 */
export const DEFAULT_PRECISION_RULES = [
    {
        coin: 'BTC',
        network: 'bitcoin',
        decimals: 8,
        smallestUnitName: 'satoshi',
        roundingMode: 'floor',
        minTransferSmallestUnit: 10000n,
    },
    {
        coin: 'ETH',
        network: 'ethereum',
        decimals: 18,
        smallestUnitName: 'wei',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000000000000n,
    },
    {
        coin: 'USDT',
        network: 'ethereum',
        decimals: 6,
        smallestUnitName: 'micro-USDT',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000n,
    },
    {
        coin: 'USDC',
        network: 'ethereum',
        decimals: 6,
        smallestUnitName: 'micro-USDC',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000n,
    },
    {
        coin: 'BNB',
        network: 'bsc',
        decimals: 18,
        smallestUnitName: 'jager',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000000000000n,
    },
    {
        coin: 'USDT',
        network: 'bsc',
        decimals: 18,
        smallestUnitName: 'wei',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000000000000n,
    },
    {
        coin: 'USDT',
        network: 'tron',
        decimals: 6,
        smallestUnitName: 'sun-USDT',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000n,
    },
    {
        coin: 'SOL',
        network: 'solana',
        decimals: 9,
        smallestUnitName: 'lamport',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000n,
    },
    {
        coin: 'USDC',
        network: 'solana',
        decimals: 6,
        smallestUnitName: 'micro-USDC',
        roundingMode: 'floor',
        minTransferSmallestUnit: 1000000n,
    },
];
export function precisionKey(coin, network) {
    return `${coin.toUpperCase()}:${network.toLowerCase()}`;
}
const DEFAULT_RULE_INDEX = new Map(DEFAULT_PRECISION_RULES.map((rule) => [precisionKey(rule.coin, rule.network), rule]));
/**
 * Resolve the precision rule for a coin/network. Throws when no rule exists so
 * that a missing rule can never silently fall back to a wrong precision.
 */
export function getPrecisionRule(coin, network, rules) {
    if (rules) {
        const key = precisionKey(coin, network);
        for (const rule of rules) {
            if (precisionKey(rule.coin, rule.network) === key)
                return rule;
        }
        throw new Error(`No money_precision_rules entry for ${key}`);
    }
    const found = DEFAULT_RULE_INDEX.get(precisionKey(coin, network));
    if (!found)
        throw new Error(`No money_precision_rules entry for ${precisionKey(coin, network)}`);
    return found;
}
function assertValidDecimals(decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
        throw new Error(`Invalid decimals: ${decimals}`);
    }
}
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
/**
 * Convert a canonical decimal amount string (e.g. "1.5") into an integer count
 * of smallest units. Rejects floating-point inputs and any amount whose
 * fractional precision exceeds the coin's decimals (which would lose money).
 */
export function toSmallestUnit(amount, decimals) {
    assertValidDecimals(decimals);
    const trimmed = amount.trim();
    if (!DECIMAL_PATTERN.test(trimmed)) {
        throw new Error(`Not a valid decimal money amount: ${JSON.stringify(amount)}`);
    }
    const negative = trimmed.startsWith('-');
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    const dotIndex = unsigned.indexOf('.');
    const intPart = dotIndex === -1 ? unsigned : unsigned.slice(0, dotIndex);
    const fracPart = dotIndex === -1 ? '' : unsigned.slice(dotIndex + 1);
    if (fracPart.length > decimals) {
        throw new Error(`Amount ${JSON.stringify(amount)} has more fractional digits than the coin's ${decimals} decimals`);
    }
    const paddedFrac = fracPart.padEnd(decimals, '0');
    const combined = `${intPart}${paddedFrac}`;
    const magnitude = BigInt(combined === '' ? '0' : combined);
    return negative ? -magnitude : magnitude;
}
/**
 * Convert an integer count of smallest units back into a canonical decimal
 * string with no trailing zeros and no trailing dot. Round-trips exactly with
 * `toSmallestUnit`.
 */
export function fromSmallestUnit(units, decimals) {
    assertValidDecimals(decimals);
    const negative = units < 0n;
    const magnitude = negative ? -units : units;
    const sign = negative ? '-' : '';
    if (decimals === 0)
        return `${sign}${magnitude.toString()}`;
    const digits = magnitude.toString().padStart(decimals + 1, '0');
    const cut = digits.length - decimals;
    const intPart = digits.slice(0, cut);
    const fracPart = digits.slice(cut).replace(/0+$/, '');
    return fracPart === '' ? `${sign}${intPart}` : `${sign}${intPart}.${fracPart}`;
}
/** Whether a smallest-unit amount clears the rule's minimum transfer floor. */
export function meetsMinTransfer(units, rule) {
    if (rule.minTransferSmallestUnit === undefined)
        return true;
    return units >= rule.minTransferSmallestUnit;
}
//# sourceMappingURL=precision.js.map