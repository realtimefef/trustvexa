/**
 * Pure deal-agreement assembly + rendering (task 4.7, Requirement 11.1/11.3).
 *
 * Side-effect free: it turns a deal row into the canonical "locked agreement"
 * object and a deterministic plaintext rendering used as the agreement
 * document body. Binary PDF rendering is performed downstream by the document
 * renderer; this layer fixes the exact, reproducible content.
 */
export interface DealAgreementSource {
    id: string;
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
    productId: string | null;
    coin: string;
    network: string;
    dealAmount: string | null;
    platformFee: string | null;
    sellerSettlementFee: string | null;
    transactionFee: string | null;
    buyerTotal: string | null;
    sellerPayout: string | null;
    feePayer: string | null;
    inspectionUntil: string | null;
    completeBy: string | null;
    fundBy: string | null;
    status: string;
}
export interface LockedAgreement {
    dealId: string;
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
    productId: string | null;
    coin: string;
    network: string;
    dealAmount: string | null;
    fees: {
        platformFee: string | null;
        sellerSettlementFee: string | null;
        transactionFee: string | null;
        feePayer: string | null;
    };
    buyerTotal: string | null;
    sellerPayout: string | null;
    inspectionUntil: string | null;
    completeBy: string | null;
    fundBy: string | null;
    termsVersion: string;
    generatedAt: string;
}
export declare function buildLockedAgreement(src: DealAgreementSource, termsVersion: string, now?: Date): LockedAgreement;
/** Deterministic plaintext rendering used as the agreement document body. */
export declare function renderAgreementText(a: LockedAgreement): string;
/** Stable, unique agreement document number (generated once per deal). */
export declare function generateDocumentNumber(dealId: string, now?: Date): string;
//# sourceMappingURL=agreement.d.ts.map