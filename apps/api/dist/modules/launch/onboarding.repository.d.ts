import type { OnboardingTaskKey } from './onboarding.js';
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export declare function markTaskComplete(tx: TxClient, userId: string, taskKey: OnboardingTaskKey): Promise<void>;
export declare function completedTaskKeys(tx: TxClient, userId: string): Promise<OnboardingTaskKey[]>;
//# sourceMappingURL=onboarding.repository.d.ts.map