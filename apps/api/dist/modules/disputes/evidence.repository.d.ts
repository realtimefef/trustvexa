export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface EvidenceRow {
    id: string;
    dispute_id: string;
    file_key: string;
    file_hash: string;
    mime_type: string;
    uploaded_by: string;
    review_status: string;
    reviewed_by: string | null;
    locked_at: string | null;
    created_at: string;
}
/** Insert evidence already hashed and immediately locked at upload (Req 24.3). */
export declare function insertLockedEvidence(tx: TxClient, input: {
    disputeId: string;
    fileKey: string;
    fileHash: string;
    mimeType: string;
    uploadedBy: string;
}): Promise<EvidenceRow>;
export declare function listEvidence(tx: TxClient, disputeId: string): Promise<EvidenceRow[]>;
export declare function setEvidenceReview(tx: TxClient, input: {
    evidenceId: string;
    reviewStatus: string;
    reviewedBy: string;
}): Promise<void>;
//# sourceMappingURL=evidence.repository.d.ts.map