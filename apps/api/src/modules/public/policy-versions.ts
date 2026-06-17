// Policy version tracking + re-acceptance logic (task 8.2, Requirements 47.5,
// 17.9-17.10). Versions are monotonic integers per doc_type; a user who
// accepted an older version must re-accept when a newer one is published.
import type { DocType } from './legal-documents.js';

export interface PolicyVersion {
  docType: DocType;
  version: number;
  summary: string;
  contentHash: string;
  publishedAt: string;
}

export function isValidVersion(version: number): boolean {
  return Number.isInteger(version) && version >= 1;
}

/** Compare two versions: -1, 0, or 1. */
export function compareVersions(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * A user must re-accept when the current published version is newer than the
 * version they last accepted (or they have never accepted).
 */
export function needsReacceptance(acceptedVersion: number | null, currentVersion: number): boolean {
  if (acceptedVersion === null) return true;
  return compareVersions(acceptedVersion, currentVersion) < 0;
}

/** Pick the latest (highest-version) entry for a doc type. */
export function latestVersion(versions: readonly PolicyVersion[]): PolicyVersion | null {
  let latest: PolicyVersion | null = null;
  for (const v of versions) {
    if (latest === null || v.version > latest.version) latest = v;
  }
  return latest;
}

/** Given the user's acceptances, list the doc types still pending acceptance. */
export function pendingAcceptances(
  required: readonly DocType[],
  currentByDoc: Readonly<Record<string, number>>,
  acceptedByDoc: Readonly<Record<string, number>>,
): DocType[] {
  return required.filter((docType) => {
    const current = currentByDoc[docType];
    if (current === undefined) return false; // nothing published yet
    const accepted = acceptedByDoc[docType];
    return needsReacceptance(accepted === undefined ? null : accepted, current);
  });
}
