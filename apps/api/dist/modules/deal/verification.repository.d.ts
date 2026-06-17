export interface DealPartiesRow {
    id: string;
    status: string;
    buyer_id: string | null;
    seller_id: string | null;
}
export declare function loadDealParties(dealId: string): Promise<DealPartiesRow | null>;
export interface VerificationCodeRow {
    id: string;
    code_hash: string;
    expires_at: string | null;
    verified_at: string | null;
    attempts: number;
}
/** Expire any still-active codes for a deal before issuing a fresh one. */
export declare function expireActiveCodes(dealId: string): Promise<void>;
export declare function insertVerificationCode(dealId: string, codeHash: string, expiresAt: string): Promise<{
    id: string;
}>;
/** Most recently issued code for a deal (null when none requested yet). */
export declare function getLatestCode(dealId: string): Promise<VerificationCodeRow | null>;
/** Increment the attempt counter (logs every attempt). Returns the new count. */
export declare function incrementAttempts(codeId: string): Promise<number>;
/** Mark a code verified iff still unverified. True only if THIS call won. */
export declare function markVerified(codeId: string): Promise<boolean>;
//# sourceMappingURL=verification.repository.d.ts.map