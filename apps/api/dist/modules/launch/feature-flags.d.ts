export type FlagScope = 'global' | 'chain' | 'feature';
export interface FeatureFlag {
    flagKey: string;
    description: string;
    isEnabled: boolean;
    scope: FlagScope;
}
/** Convention: chain flags are keyed `chain:<NETWORK>` (e.g. `chain:ETH`). */
export declare function chainFlagKey(network: string): string;
/**
 * Resolve whether a feature is enabled. Unknown flags default to `false`
 * (fail-closed) so a missing dark-launch flag never exposes a risky feature.
 */
export declare function isFeatureEnabled(flags: readonly FeatureFlag[], flagKey: string): boolean;
/** Whether a specific chain is enabled for new activity. */
export declare function isChainEnabled(flags: readonly FeatureFlag[], network: string): boolean;
//# sourceMappingURL=feature-flags.d.ts.map