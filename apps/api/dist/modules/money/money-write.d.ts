/** Minimal structural shape of a transactional pooled client (pg.PoolClient). */
export interface MoneyTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
    release: () => void;
}
/** Acquire a dedicated pooled client for a money-write transaction. */
export declare function acquireMoneyClient(): Promise<MoneyTxClient>;
/**
 * Deterministic, key-order-independent serialization used to fingerprint a
 * request payload. Object keys are sorted recursively so two equivalent
 * payloads hash identically; `bigint` is encoded losslessly as a string.
 */
export declare function canonicalize(value: unknown): string;
/** SHA-256 fingerprint of a request payload for idempotency replay-mismatch detection. */
export declare function requestHash(payload: unknown): string;
/**
 * Bump a deal's optimistic-lock version, asserting it had not advanced. Throws
 * `concurrent_update` (409) when a concurrent writer already won. Must be
 * called inside the money-write transaction.
 */
export declare function lockDealVersion(client: MoneyTxClient, dealId: string, expectedVersion: number): Promise<number>;
export interface MoneyWriteRequest<T> {
    /** Required `Idempotency-Key` for this money/state request. */
    readonly idempotencyKey: string;
    /** Logical action name, e.g. `fund_deal`, `release_payout`. */
    readonly actionType: string;
    /** Acting user id, or null for system-initiated writes. */
    readonly userId: string | null;
    readonly dealId?: string | null;
    /** Request payload; hashed to detect key reuse with a different body. */
    readonly payload: unknown;
    /** Idempotency record lifetime; defaults to 24h. */
    readonly ttlSeconds?: number;
    /**
     * The actual money mutation. Runs inside the transaction with the claimed
     * client. Its result must be JSON-serializable (no `bigint`) so it can be
     * stored and replayed verbatim.
     */
    readonly work: (client: MoneyTxClient) => Promise<T>;
    /** Override the client source (dependency injection for tests). */
    readonly clientFactory?: () => Promise<MoneyTxClient>;
}
export interface MoneyWriteOutcome<T> {
    /** True when the original result was replayed for a repeated key. */
    readonly replayed: boolean;
    readonly result: T;
}
/**
 * Execute a money write exactly once per idempotency key, atomically and under
 * an optimistic lock. Returns the (possibly replayed) result.
 */
export declare function runMoneyWrite<T>(req: MoneyWriteRequest<T>): Promise<MoneyWriteOutcome<T>>;
//# sourceMappingURL=money-write.d.ts.map