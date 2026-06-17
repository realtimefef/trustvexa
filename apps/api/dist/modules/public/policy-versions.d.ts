import type { DocType } from './legal-documents.js';
export interface PolicyVersion {
    docType: DocType;
    version: number;
    summary: string;
    contentHash: string;
    publishedAt: string;
}
export declare function isValidVersion(version: number): boolean;
/** Compare two versions: -1, 0, or 1. */
export declare function compareVersions(a: number, b: number): -1 | 0 | 1;
/**
 * A user must re-accept when the current published version is newer than the
 * version they last accepted (or they have never accepted).
 */
export declare function needsReacceptance(acceptedVersion: number | null, currentVersion: number): boolean;
/** Pick the latest (highest-version) entry for a doc type. */
export declare function latestVersion(versions: readonly PolicyVersion[]): PolicyVersion | null;
/** Given the user's acceptances, list the doc types still pending acceptance. */
export declare function pendingAcceptances(required: readonly DocType[], currentByDoc: Readonly<Record<string, number>>, acceptedByDoc: Readonly<Record<string, number>>): DocType[];
//# sourceMappingURL=policy-versions.d.ts.map