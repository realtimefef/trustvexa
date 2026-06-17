// Emergency pause / kill switch (task 9.1, Requirements 35.3, 35.4). A middleman
// can halt categories of activity; every active pause blocks the matching
// action and surfaces a banner. Persistence lives in incident-pause.repository.
const ACTION_TO_SCOPE = {
    create_deal: 'new_deals',
    deposit: 'deposits',
    payout: 'payouts',
    withdrawal: 'withdrawals',
    signup: 'signups',
};
export function activePauses(pauses) {
    return pauses.filter((p) => p.endedAt === null);
}
/**
 * Whether an action is currently blocked. A chain-scoped pause blocks
 * chain-bound actions (create_deal/deposit/payout/withdrawal) on that chain.
 */
export function isActionBlocked(pauses, action, chain) {
    const active = activePauses(pauses);
    const scope = ACTION_TO_SCOPE[action];
    for (const pause of active) {
        if (pause.scope === scope)
            return true;
        if (pause.scope === 'chain' && action !== 'signup' && chain != null && pause.chain === chain) {
            return true;
        }
    }
    return false;
}
/** Human-readable banner for the maintenance/incident notice, or null. */
export function pauseBanner(pauses) {
    const active = activePauses(pauses);
    if (active.length === 0)
        return null;
    const scopes = active.map((p) => (p.scope === 'chain' ? `chain:${p.chain ?? '?'}` : p.scope));
    return `Service temporarily paused: ${scopes.join(', ')}. We'll restore access shortly.`;
}
//# sourceMappingURL=emergency-pause.js.map