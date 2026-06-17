export interface ReferralView {
    id: string;
    code: string;
    invitedEmailHash: string | null;
    status: string | null;
    createdAt: string;
}
export interface ReferralCodeView {
    id: string;
    code: string;
    status: string | null;
    createdAt: string;
}
export interface ReferralListView {
    /** The caller's shareable referral code, or null if not yet created. */
    code: string | null;
    referrals: ReferralView[];
}
/** Get-or-create the caller's referral code holder row. Idempotent. */
export declare function getOrCreateCode(userId: string): Promise<ReferralCodeView>;
/** List the caller's referrals plus their own shareable code. */
export declare function listReferrals(userId: string): Promise<ReferralListView>;
//# sourceMappingURL=referrals.service.d.ts.map