import type { FeatureFlag, FlagScope } from './feature-flags.js';
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export declare function listFlags(tx: TxClient): Promise<FeatureFlag[]>;
export declare function setFlag(tx: TxClient, input: {
    flagKey: string;
    description: string;
    isEnabled: boolean;
    scope: FlagScope;
    updatedBy: string;
}): Promise<FeatureFlag>;
//# sourceMappingURL=feature-flags.repository.d.ts.map