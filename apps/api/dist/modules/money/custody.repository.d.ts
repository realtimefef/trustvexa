/**
 * Custody persistence (task 5.25, DB-bound).
 *
 * Records hot->cold sweeps, gas top-ups, stuck-tx retries, and address
 * screening/poisoning alerts. Decision logic lives in `custody.ts`; this module
 * only persists. `bigint` smallest-unit amounts are bound as strings.
 */
import type { StuckAction } from './custody.js';
export interface CustodyTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface RecordSweepInput {
    coin: string;
    network: string;
    amountSmallestUnit: bigint;
    thresholdSmallestUnit: bigint;
    fromHotAddress: string;
    toColdAddress: string;
    txHash: string | null;
}
export declare function recordSweep(client: CustodyTxClient, input: RecordSweepInput): Promise<void>;
export interface RecordGasTopUpInput {
    coin: string;
    network: string;
    fromAddress: string;
    toHotWalletAddress: string;
    amountSmallestUnit: bigint;
    txHash: string | null;
    status: string;
}
export declare function recordGasTopUp(client: CustodyTxClient, input: RecordGasTopUpInput): Promise<void>;
export interface RecordRetryInput {
    paymentId: string | null;
    payoutQueueId: string | null;
    dealId: string;
    reason: string;
    action: StuckAction;
    oldTxHash: string | null;
    newTxHash: string | null;
    status: string;
}
export declare function recordTransactionRetry(client: CustodyTxClient, input: RecordRetryInput): Promise<void>;
export interface RecordPoisoningAlertInput {
    userId: string | null;
    dealId: string | null;
    suspectedAddress: string;
    realAddress: string;
    sourceTxHash: string | null;
}
export declare function recordPoisoningAlert(client: CustodyTxClient, input: RecordPoisoningAlertInput): Promise<void>;
export interface RecordScreeningInput {
    address: string;
    coin: string;
    network: string;
    result: string;
    source: string;
}
export declare function recordAddressScreening(client: CustodyTxClient, input: RecordScreeningInput): Promise<void>;
//# sourceMappingURL=custody.repository.d.ts.map