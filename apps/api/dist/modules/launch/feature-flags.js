// Feature flags for dark-launch / instant-disable of risky features or chains.
// (task 9.1, Requirements 35.1, 35.2). Pure resolution logic; persistence lives
// in feature-flags.repository.ts.
/** Convention: chain flags are keyed `chain:<NETWORK>` (e.g. `chain:ETH`). */
export function chainFlagKey(network) {
    return `chain:${network}`;
}
function findFlag(flags, flagKey) {
    return flags.find((f) => f.flagKey === flagKey);
}
/**
 * Resolve whether a feature is enabled. Unknown flags default to `false`
 * (fail-closed) so a missing dark-launch flag never exposes a risky feature.
 */
export function isFeatureEnabled(flags, flagKey) {
    return findFlag(flags, flagKey)?.isEnabled ?? false;
}
/** Whether a specific chain is enabled for new activity. */
export function isChainEnabled(flags, network) {
    const flag = findFlag(flags, chainFlagKey(network));
    // A chain with no explicit flag is considered enabled (opt-out model for
    // chains), but an explicit disabled flag instantly kills it.
    return flag ? flag.isEnabled : true;
}
//# sourceMappingURL=feature-flags.js.map