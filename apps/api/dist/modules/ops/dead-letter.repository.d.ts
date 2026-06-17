import type { DlqStatus } from './dead-letter.js';
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface DeadLetterJobRow {
    id: string;
    job_type: string;
    original_job_id: string;
    payload_enc: string;
    failure_reason: string;
    retry_count: number;
    status: DlqStatus;
    last_failed_at: string;
}
export declare function recordDeadLetter(tx: TxClient, input: {
    jobType: string;
    originalJobId: string;
    payloadEnc: string;
    failureReason: string;
    retryCount: number;
    status: DlqStatus;
}): Promise<DeadLetterJobRow>;
export declare function setDeadLetterStatus(tx: TxClient, id: string, status: DlqStatus): Promise<void>;
//# sourceMappingURL=dead-letter.repository.d.ts.map