export declare const GENESIS_PREV_HASH: string;
export interface EscrowLogInput {
    readonly dealId: string;
    readonly fromState: string;
    readonly toState: string;
    readonly actorId: string;
    readonly requestId: string;
    readonly createdAt: string;
}
export interface EscrowLogEntry extends EscrowLogInput {
    readonly prevHash: string;
    readonly entryHash: string;
}
export declare function computeEntryHash(input: EscrowLogInput, prevHash: string): string;
export declare function appendEntry(input: EscrowLogInput, prevHash?: string): EscrowLogEntry;
/** Returns the index of the first broken link, or -1 when the chain is intact. */
export declare function verifyChain(entries: ReadonlyArray<EscrowLogEntry>): number;
export declare function isChainValid(entries: ReadonlyArray<EscrowLogEntry>): boolean;
//# sourceMappingURL=audit-chain.d.ts.map