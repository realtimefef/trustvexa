export type DlqStatus = 'pending' | 'retrying' | 'failed' | 'resolved';
export declare const MAX_RETRIES = 5;
export declare const BASE_BACKOFF_MS = 1000;
export declare const MAX_BACKOFF_MS: number;
/** Exponential backoff with a hard cap. retryCount is 0-based. */
export declare function nextRetryDelayMs(retryCount: number): number;
export declare function shouldRetry(retryCount: number): boolean;
/** Compute the next status after a processing attempt fails. */
export declare function statusAfterFailure(retryCount: number): DlqStatus;
/** Legal status transitions; guards manual operator actions. */
export declare function canTransition(from: DlqStatus, to: DlqStatus): boolean;
//# sourceMappingURL=dead-letter.d.ts.map