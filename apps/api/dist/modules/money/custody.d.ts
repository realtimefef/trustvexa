export declare function isStuckTx(submittedAtIso: string, nowIso: string, stuckAfterSeconds: number): boolean;
export type StuckAction = 'fee_bump' | 'replace_by_fee' | 'tracked_retry';
/**
 * Choose a recovery action for a stuck tx. EVM chains support replace-by-fee /
 * fee-bump (same nonce); others get a tracked retry. Never produces a second,
 * independent paying transaction.
 */
export declare function planStuckTxAction(chainSupportsRbf: boolean, canBumpFee: boolean): StuckAction;
export interface PayingTxRef {
    nonce: number | null;
    intentKey: string;
}
export declare class DuplicatePayingTxError extends Error {
    constructor(message: string);
}
/**
 * A replacement tx must represent the SAME logical payment (same intent, and
 * same nonce where the chain has one). Otherwise it would be a second paying
 * tx — a double spend of escrow funds.
 */
export declare function assertNotDuplicatePayingTx(original: PayingTxRef, replacement: PayingTxRef): void;
export interface SweepPlan {
    shouldSweep: boolean;
    sweepAmountSmallestUnit: bigint;
}
/**
 * Sweep excess hot-wallet balance to cold storage when it exceeds the sweep
 * threshold, leaving exactly the target operational reserve behind.
 */
export declare function sweepPlan(hotBalanceSmallestUnit: bigint, sweepThresholdSmallestUnit: bigint, targetReserveSmallestUnit: bigint): SweepPlan;
export interface GasReserveStatus {
    low: boolean;
    topUpAmountSmallestUnit: bigint;
    pauseRiskyPayouts: boolean;
}
/** Gas reserve health: below the minimum triggers a top-up and pauses payouts. */
export declare function gasReserveStatus(balanceSmallestUnit: bigint, minReserveSmallestUnit: bigint, topUpToSmallestUnit: bigint): GasReserveStatus;
/**
 * Address-poisoning heuristic: an attacker seeds a look-alike address sharing
 * the victim's leading/trailing characters but differing in the middle.
 */
export declare function isLookAlikeAddress(real: string, candidate: string, edge?: number): boolean;
export declare class RawKeyMaterialError extends Error {
    constructor(message: string);
}
/** Throws if any string in the record looks like raw private-key material. */
export declare function assertNoRawKeyMaterial(record: unknown): void;
//# sourceMappingURL=custody.d.ts.map