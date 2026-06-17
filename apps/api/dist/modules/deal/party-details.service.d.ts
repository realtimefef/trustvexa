export interface SubmitSellerDetailsInput {
    productName?: string | null;
    productDescription?: string | null;
    requirements?: string | null;
    deliveryMethod?: string | null;
    deliveryInstructions?: string | null;
    estimatedDeliveryTime?: string | null;
    additionalNotes?: string | null;
}
export interface SubmitBuyerDetailsInput {
    receivingPlatform?: string | null;
    receivingAddress?: string | null;
    contactEmail?: string | null;
    backupContact?: string | null;
    specialInstructions?: string | null;
    suggestions?: string | null;
}
export interface SellerDetailsView {
    id: string;
    dealId: string;
    productName: string | null;
    productDescription: string | null;
    requirements: string | null;
    deliveryMethod: string | null;
    deliveryInstructions: string | null;
    estimatedDeliveryTime: string | null;
    additionalNotes: string | null;
    submittedAt: string | null;
    verifiedByMiddleman: boolean;
    verifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface BuyerDetailsView {
    id: string;
    dealId: string;
    receivingPlatform: string | null;
    receivingAddress: string | null;
    contactEmail: string | null;
    backupContact: string | null;
    specialInstructions: string | null;
    suggestions: string | null;
    confirmedByBuyer: boolean;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface PartyDetailsResult {
    sellerDetails: SellerDetailsView | null;
    buyerDetails: BuyerDetailsView | null;
}
/**
 * Submit (upsert) the seller's product and delivery details for a deal.
 * Only the deal's seller may call this. Encrypted PII fields are sealed before
 * storage. Re-submitting updates the existing record.
 */
export declare function submitSellerDetails(userId: string, dealId: string, input: SubmitSellerDetailsInput): Promise<SellerDetailsView>;
/**
 * Submit (upsert) the buyer's receiving information for a deal.
 * Only the deal's buyer may call this. Encrypted PII fields are sealed before
 * storage. Re-submitting updates the existing record.
 */
export declare function submitBuyerDetails(userId: string, dealId: string, input: SubmitBuyerDetailsInput): Promise<BuyerDetailsView>;
/**
 * Retrieve party details for a deal with role-based visibility:
 *   - middleman: sees both seller details (decrypted) AND buyer details (decrypted)
 *   - seller:    sees only their own seller details (decrypted), NOT buyer details
 *   - buyer:     sees only their own buyer details (decrypted), NOT seller details
 *
 * Returns null for records that do not exist yet or that the caller is not
 * permitted to read.
 */
export declare function getPartyDetails(userId: string, dealId: string): Promise<PartyDetailsResult>;
/**
 * Mark one side of the party details as verified by the middleman.
 * Only the deal's assigned middleman may call this.
 */
export declare function verifyPartyDetails(middlemanId: string, dealId: string, role: 'seller' | 'buyer'): Promise<{
    dealId: string;
    role: 'seller' | 'buyer';
    verifiedAt: string;
}>;
//# sourceMappingURL=party-details.service.d.ts.map