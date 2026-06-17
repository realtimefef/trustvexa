import type { InviteSummaryRow } from './invite.repository.js';
import type { CreateInviteInput } from './invite.schemas.js';
export interface CreatedInvite {
    inviteId: string;
    token: string;
    inviteUrl: string;
    expiresAt: string | null;
    dealStatus: string;
}
export declare function createInvite(args: {
    sellerId: string;
    dealId: string;
    input: CreateInviteInput;
}): Promise<CreatedInvite>;
export interface InvitePreview {
    dealId: string;
    status: string;
    coin: string;
    network: string;
    dealAmountCents: number | null;
    counterparty: {
        accountLabel: string | null;
        completedDeals: number | null;
        disputeRateBand: string | null;
        riskWarning: string | null;
    } | null;
}
export declare function previewInvite(args: {
    viewerId: string;
    token: string;
}): Promise<InvitePreview>;
export interface AcceptedInvite {
    dealId: string;
    status: string;
}
export declare function acceptInvite(args: {
    userId: string;
    token: string;
}): Promise<AcceptedInvite>;
export declare function listInvites(args: {
    sellerId: string;
    dealId: string;
}): Promise<InviteSummaryRow[]>;
export declare function revokeInvite(args: {
    sellerId: string;
    inviteId: string;
    reason: string | null;
}): Promise<void>;
//# sourceMappingURL=invite.service.d.ts.map