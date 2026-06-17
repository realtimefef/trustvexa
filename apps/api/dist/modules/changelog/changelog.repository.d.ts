export interface ChangelogEntryRow {
    id: string;
    version: string | null;
    title: string | null;
    body: string | null;
    published_at: Date | string | null;
    created_at: Date | string;
}
/** List published changelog entries, newest first. */
export declare function listPublishedEntries(): Promise<ChangelogEntryRow[]>;
//# sourceMappingURL=changelog.repository.d.ts.map