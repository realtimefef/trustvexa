import type { DealRole } from './terms.repository.js';
import type { AcceptTermsInput } from './terms.schemas.js';
export declare function getAgreement(args: {
    dealId: string;
    requesterId: string;
}): Promise<{
    agreement: import("./agreement.js").LockedAgreement;
    documentText: string;
    acceptance: {
        buyerAcceptedAt: string | null;
        sellerAcceptedAt: string | null;
        middlemanAcceptedAt: string | null;
    };
    requiredPolicyVersions: {
        terms: string | null;
        disputePolicy: string | null;
    };
    requiredAcknowledgements: string[];
}>;
export interface AcceptTermsResult {
    dealId: string;
    role: DealRole;
    status: string;
    bothAccepted: boolean;
    agreementDocumentNumber: string | null;
}
export declare function acceptTerms(args: {
    dealId: string;
    userId: string;
    input: AcceptTermsInput;
}): Promise<AcceptTermsResult>;
//# sourceMappingURL=terms.service.d.ts.map