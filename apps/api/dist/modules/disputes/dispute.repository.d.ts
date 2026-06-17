export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface DisputeRow {
    id: string;
    deal_id: string;
    raised_by: string;
    reason: string;
    status: string;
    resolution: string | null;
    final_decision_note: string | null;
    decision_pdf_key: string | null;
    resolved_at: string | null;
    created_at: string;
}
export declare function openDispute(tx: TxClient, input: {
    dealId: string;
    raisedBy: string;
    reason: string;
}): Promise<DisputeRow>;
export declare function getDispute(tx: TxClient, disputeId: string): Promise<DisputeRow | null>;
export declare function resolveDispute(tx: TxClient, input: {
    disputeId: string;
    resolution: string;
    decisionNote: string;
    decisionPdfKey: string | null;
}): Promise<void>;
/** Lock all threads on a dispute once it is resolved (no further messages). */
export declare function lockDisputeThreads(tx: TxClient, disputeId: string): Promise<void>;
/** Create the open discussion thread for a newly opened dispute. */
export declare function createThread(tx: TxClient, disputeId: string): Promise<string>;
/** The newest open thread for a dispute (messages are appended here). */
export declare function getOpenThread(tx: TxClient, disputeId: string): Promise<string | null>;
export declare function appendThreadMessage(tx: TxClient, input: {
    threadId: string;
    senderId: string;
    bodyEnc: string;
    role: 'buyer' | 'seller' | 'middleman';
}): Promise<string>;
//# sourceMappingURL=dispute.repository.d.ts.map