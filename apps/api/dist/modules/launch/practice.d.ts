export type NetworkMode = 'mainnet' | 'testnet';
/** Practice deals always run on testnet. */
export declare function resolveNetworkMode(isPractice: boolean): NetworkMode;
/** A deal handles real money only when it is not practice AND on mainnet. */
export declare function isRealMoney(isPractice: boolean, networkMode: NetworkMode): boolean;
/** Mainnet operations are opt-in and remain disabled until the operator completes go-live. */
export declare function mainnetOperationAllowed(env?: NodeJS.ProcessEnv): boolean;
export declare class PracticeModeError extends Error {
}
/** Guard: practice deals must never be configured on mainnet. */
export declare function assertPracticeNetwork(isPractice: boolean, networkMode: NetworkMode): void;
//# sourceMappingURL=practice.d.ts.map