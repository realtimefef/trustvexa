// Dead-letter queue logic for failed jobs (task 9.2, Requirement 45.8). Pure
// retry/backoff + status transitions; persistence in dead-letter.repository.ts.
export const MAX_RETRIES = 5;
export const BASE_BACKOFF_MS = 1_000;
export const MAX_BACKOFF_MS = 60 * 60 * 1_000; // 1 hour cap
/** Exponential backoff with a hard cap. retryCount is 0-based. */
export function nextRetryDelayMs(retryCount) {
    if (retryCount < 0)
        throw new Error('retryCount must be non-negative');
    const delay = BASE_BACKOFF_MS * 2 ** retryCount;
    return Math.min(delay, MAX_BACKOFF_MS);
}
export function shouldRetry(retryCount) {
    return retryCount < MAX_RETRIES;
}
/** Compute the next status after a processing attempt fails. */
export function statusAfterFailure(retryCount) {
    return shouldRetry(retryCount) ? 'retrying' : 'failed';
}
/** Legal status transitions; guards manual operator actions. */
export function canTransition(from, to) {
    const allowed = {
        pending: ['retrying', 'failed', 'resolved'],
        retrying: ['retrying', 'failed', 'resolved'],
        failed: ['retrying', 'resolved'],
        resolved: [],
    };
    return allowed[from].includes(to);
}
//# sourceMappingURL=dead-letter.js.map