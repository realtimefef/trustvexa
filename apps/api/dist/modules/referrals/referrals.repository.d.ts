/** Minimal transactional client (pg.PoolClient satisfies this). */
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface ReferralRow {
    id: string;
    code: string;
    invited_email_hash: string | null;
    status: string | null;
    created_at: Date | string;
}
/** Find the caller's self-issued referral code holder row, if any. */
export declare function findOwnCode(tx: TxClient, userId: string): Promise<ReferralRow | null>;
export interface InsertOwnCodeInput {
    userId: string;
    code: string;
    status: string;
}
/** Insert the caller's self-issued referral code holder row. */
export declare function insertOwnCode(tx: TxClient, input: InsertOwnCodeInput): Promise<ReferralRow>;
/** List all of the caller's referral rows, newest first. */
export declare function listReferralsForUser(userId: string): Promise<ReferralRow[]>;
//# sourceMappingURL=referrals.repository.d.ts.map