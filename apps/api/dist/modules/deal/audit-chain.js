/**
 * Hash-chained audit log helper (`escrow_logs`) — Tasks 4.9 / 4.12.
 *
 * Every escrow log row is linked to the previous one: entry_hash =
 * SHA-256(prev_hash + canonical(payload)). Altering any entry breaks the chain
 * downstream, making tampering detectable (Property 20). Serialization is
 * key-sorted so the hash is deterministic and reproducible.
 * (Requirements 13.3, 38.4)
 */
import { createHash } from 'node:crypto';
export const GENESIS_PREV_HASH = '0'.repeat(64);
function canonical(input, prevHash) {
    return JSON.stringify({
        actorId: input.actorId,
        createdAt: input.createdAt,
        dealId: input.dealId,
        fromState: input.fromState,
        prevHash,
        requestId: input.requestId,
        toState: input.toState,
    });
}
export function computeEntryHash(input, prevHash) {
    return createHash('sha256').update(canonical(input, prevHash), 'utf8').digest('hex');
}
export function appendEntry(input, prevHash = GENESIS_PREV_HASH) {
    const entryHash = computeEntryHash(input, prevHash);
    return { ...input, prevHash, entryHash };
}
/** Returns the index of the first broken link, or -1 when the chain is intact. */
export function verifyChain(entries) {
    let expectedPrev = GENESIS_PREV_HASH;
    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (entry.prevHash !== expectedPrev)
            return i;
        if (computeEntryHash(entry, entry.prevHash) !== entry.entryHash)
            return i;
        expectedPrev = entry.entryHash;
    }
    return -1;
}
export function isChainValid(entries) {
    return verifyChain(entries) === -1;
}
//# sourceMappingURL=audit-chain.js.map