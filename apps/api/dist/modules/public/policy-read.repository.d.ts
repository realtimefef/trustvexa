export interface PolicyVersionRow {
    doc_type: string;
    version: number;
    summary: string | null;
    content_hash: string | null;
    published_at: Date | string | null;
}
export declare function listLatestVersions(): Promise<PolicyVersionRow[]>;
//# sourceMappingURL=policy-read.repository.d.ts.map