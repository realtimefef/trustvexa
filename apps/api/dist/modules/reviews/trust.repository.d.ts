export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface TrustEventRow {
    id: string;
    user_id: string;
    change: number;
    reason: string;
    deal_id: string | null;
    created_at: string;
}
export interface WarningNoticeRow {
    id: string;
    user_id: string;
    warning_type: string;
    deal_id: string | null;
    message: string;
    acknowledged_at: string | null;
    created_at: string;
}
export declare function appendTrustEvent(tx: TxClient, input: {
    userId: string;
    change: number;
    reason: string;
    dealId: string | null;
}): Promise<TrustEventRow>;
/** Count missed-deadline trust events for a user (feeds the restriction engine). */
export declare function countMissedDeadlines(tx: TxClient, userId: string): Promise<number>;
export declare function insertWarningNotice(tx: TxClient, input: {
    userId: string;
    warningType: string;
    dealId: string | null;
    message: string;
}): Promise<WarningNoticeRow>;
export declare function acknowledgeWarning(tx: TxClient, noticeId: string): Promise<void>;
//# sourceMappingURL=trust.repository.d.ts.map