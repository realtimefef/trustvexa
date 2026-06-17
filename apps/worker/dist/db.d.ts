/** Minimal query client accepted by the API repository functions. */
export interface DbClient {
    query<R = unknown>(text: string, params?: readonly unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
/** Pool-backed client for single statements (each runs on its own connection). */
export declare const db: DbClient;
export type WithTransaction = <T>(fn: (tx: DbClient) => Promise<T>) => Promise<T>;
/**
 * Run `fn` inside a single transaction on a dedicated pooled connection.
 * Commits on success, rolls back on any error, and always releases the client.
 */
export declare const withTransaction: WithTransaction;
//# sourceMappingURL=db.d.ts.map