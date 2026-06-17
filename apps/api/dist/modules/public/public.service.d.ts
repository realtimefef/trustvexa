export interface PolicyVersionView {
    docType: string;
    version: number;
    summary: string | null;
    contentHash: string | null;
    publishedAt: string | null;
}
export declare function getPolicyVersions(): Promise<{
    versions: PolicyVersionView[];
}>;
//# sourceMappingURL=public.service.d.ts.map