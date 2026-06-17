// Shared formatting helpers for public-facing pages. Pure, integer-safe.
/** Format integer USD cents as a display string, e.g. 40_000n -> "$400.00". */
export function formatUsdCents(cents) {
    const negative = cents < 0n;
    const abs = negative ? -cents : cents;
    const dollars = abs / 100n;
    const remainder = abs % 100n;
    const grouped = groupThousands(dollars);
    return `${negative ? '-' : ''}$${grouped}.${remainder.toString().padStart(2, '0')}`;
}
/** Format basis points as a percentage string, e.g. 175n -> "1.75%", 500n -> "5%". */
export function formatBps(bps) {
    const whole = bps / 100n;
    const frac = bps % 100n;
    if (frac === 0n)
        return `${whole.toString()}%`;
    const fracStr = frac.toString().padStart(2, '0').replace(/0+$/, '');
    return `${whole.toString()}.${fracStr}%`;
}
function groupThousands(value) {
    const digits = value.toString();
    let out = '';
    let count = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
        out = digits[i] + out;
        count++;
        if (count % 3 === 0 && i > 0)
            out = ',' + out;
    }
    return out;
}
//# sourceMappingURL=format.js.map