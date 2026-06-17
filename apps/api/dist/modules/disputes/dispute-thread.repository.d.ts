/**
 * Persistence for dispute threads — open/lookup helpers used by the dispute
 * write endpoints (Requirements 24.1, 24.2). A dispute owns one open thread; it
 * is created when the dispute is opened and locked when the dispute resolves.
 * Statements are appended via `appendThreadMessage` in `dispute.repository.ts`.
 * Not barrel-exported.
 */
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface ThreadRow {
    id: string;
    dispute_id: string;
    status: string;
    locked_at: string | null;
    created_at: string;
}
/** Create the initial open thread for a freshly opened dispute. */
export declare function createThread(tx: TxClient, disputeId: string): Promise<ThreadRow>;
/**
 * Return the dispute's current open thread id, or null when none is open (the
 * dispute has no thread yet or every thread is locked). Used to target a posted
 * statement; the insert itself re-checks the thread is still `open`.
 */
export declare function getOpenThreadId(tx: TxClient, disputeId: string): Promise<string | null>;
//# sourceMappingURL=dispute-thread.repository.d.ts.map