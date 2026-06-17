import type { TxClient } from './deal.repository.js';
export type DealRole = 'buyer' | 'seller' | 'middleman';
export interface TermsDealRow {
    id: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    product_id: string | null;
    coin: string;
    network: string;
    deal_amount: string | null;
    platform_fee: string | null;
    seller_settlement_fee: string | null;
    transaction_fee: string | null;
    buyer_total: string | null;
    seller_payout: string | null;
    fee_payer: string | null;
    inspection_until: string | Date | null;
    complete_by: string | Date | null;
    fund_by: string | Date | null;
    status: string;
}
export declare function loadDealForAgreement(dealId: string): Promise<TermsDealRow | null>;
export interface TermsRow {
    version: number;
    terms_snapshot: string | null;
    accepted_by_buyer_at: string | null;
    accepted_by_seller_at: string | null;
    accepted_by_middleman_at: string | null;
}
export declare function loadLatestTerms(dealId: string): Promise<TermsRow | null>;
/** Stamp the acceptance time for one role on the given terms version. */
export declare function recordRoleAcceptance(client: TxClient, dealId: string, version: number, role: DealRole): Promise<void>;
/** Read the buyer/seller acceptance stamps for a version inside a transaction. */
export declare function loadAcceptanceState(client: TxClient, dealId: string, version: number): Promise<{
    buyer: boolean;
    seller: boolean;
}>;
export interface LegalAcceptanceParams {
    dealId: string;
    userId: string;
    termsVersion: string;
    disputePolicyVersion: string;
    cryptoRisk: boolean;
    wrongNetworkWarning: boolean;
    noProhibitedItems: boolean;
}
export declare function insertLegalAcceptance(client: TxClient, params: LegalAcceptanceParams): Promise<void>;
/** Latest published version string for a policy doc type, or null if none. */
export declare function getCurrentPolicyVersion(docType: string): Promise<string | null>;
//# sourceMappingURL=terms.repository.d.ts.map