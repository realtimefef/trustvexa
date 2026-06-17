export type OperatorInputKey = 'business_entity' | 'escrow_wallets' | 'signing_keys' | 'rpc_endpoints' | 'google_oauth' | 'mail_provider' | 'object_storage' | 'cdn_waf';
export interface OperatorInputSpec {
    key: OperatorInputKey;
    label: string;
}
export declare const REQUIRED_OPERATOR_INPUTS: readonly OperatorInputSpec[];
export interface GoLiveBlocker {
    key: OperatorInputKey;
    label: string;
}
export interface GoLiveStatus {
    ready: boolean;
    blockers: GoLiveBlocker[];
}
/**
 * Evaluate the go-live gate. `provided[key] === true` means the operator input
 * is supplied AND verified. Any missing/false input is a blocker.
 */
export declare function evaluateGoLive(provided: Readonly<Partial<Record<OperatorInputKey, boolean>>>): GoLiveStatus;
/** Real-money (mainnet) operation is permitted only once the gate is green. */
export declare function realMoneyAllowed(status: GoLiveStatus): boolean;
//# sourceMappingURL=go-live-gate.d.ts.map