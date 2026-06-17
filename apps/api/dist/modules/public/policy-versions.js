export function isValidVersion(version) {
    return Number.isInteger(version) && version >= 1;
}
/** Compare two versions: -1, 0, or 1. */
export function compareVersions(a, b) {
    if (a < b)
        return -1;
    if (a > b)
        return 1;
    return 0;
}
/**
 * A user must re-accept when the current published version is newer than the
 * version they last accepted (or they have never accepted).
 */
export function needsReacceptance(acceptedVersion, currentVersion) {
    if (acceptedVersion === null)
        return true;
    return compareVersions(acceptedVersion, currentVersion) < 0;
}
/** Pick the latest (highest-version) entry for a doc type. */
export function latestVersion(versions) {
    let latest = null;
    for (const v of versions) {
        if (latest === null || v.version > latest.version)
            latest = v;
    }
    return latest;
}
/** Given the user's acceptances, list the doc types still pending acceptance. */
export function pendingAcceptances(required, currentByDoc, acceptedByDoc) {
    return required.filter((docType) => {
        const current = currentByDoc[docType];
        if (current === undefined)
            return false; // nothing published yet
        const accepted = acceptedByDoc[docType];
        return needsReacceptance(accepted === undefined ? null : accepted, current);
    });
}
//# sourceMappingURL=policy-versions.js.map