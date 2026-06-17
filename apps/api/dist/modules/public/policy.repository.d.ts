export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface PolicyVersionRow {
    id: string;
    doc_type: string;
    version: number;
    summary: string;
    content_hash: string;
    published_at: string;
}
export declare function publishVersion(tx: TxClient, input: {
    docType: string;
    version: number;
    summary: string;
    contentHash: string;
}): Promise<PolicyVersionRow>;
export declare function latestPublishedVersion(tx: TxClient, docType: string): Promise<PolicyVersionRow | null>;
/** Latest published version number per doc_type, for the re-acceptance gate. */
export declare function currentVersionsByDoc(tx: TxClient): Promise<Record<string, number>>;
//# sourceMappingURL=policy.repository.d.ts.map