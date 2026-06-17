export interface ChangelogEntryView {
    id: string;
    version: string | null;
    title: string | null;
    body: string | null;
    publishedAt: string | null;
    createdAt: string;
}
export declare function listChangelog(): Promise<ChangelogEntryView[]>;
//# sourceMappingURL=changelog.service.d.ts.map