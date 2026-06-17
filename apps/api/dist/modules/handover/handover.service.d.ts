type Role = 'buyer' | 'seller' | 'middleman';
export interface HandoverItemView {
    id: string;
    itemType: string;
    verificationStatus: string;
    revealStatus: string;
    revealedToBuyer: boolean;
    transferredAt: string | null;
    createdAt: string | null;
}
export interface HandoverView {
    dealId: string;
    role: Role;
    items: HandoverItemView[];
}
export declare function getHandoverForUser(userId: string, dealId: string): Promise<HandoverView>;
/**
 * Reveal a handover item's credentials to the buyer. This is a middleman-only,
 * audited state change (`middleman_only` -> `revealed_to_buyer`) and never
 * returns the secret payload itself. The action is naturally idempotent: a
 * second call on an already-revealed item returns the current state.
 */
export declare function revealHandoverItem(userId: string, itemId: string): Promise<HandoverItemView>;
export {};
//# sourceMappingURL=handover.service.d.ts.map