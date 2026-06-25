import type { TxClient } from './deal.repository.js';
export interface InsertInviteParams {
    dealId: string;
    tokenHash: string;
    intendedUserHint: string | null;
    singleUse: boolean;
    expiresAt: string | null;
}
export declare function insertInvite(client: TxClient, params: InsertInviteParams): Promise<{
    id: string;
    created_at: string;
}>;
export interface InviteRow {
    id: string;
    deal_id: string;
    single_use: boolean;
    expires_at: string | null;
    used_at: string | null;
    revoked_at: string | null;
}
export declare function getInviteByTokenHash(tokenHash: string): Promise<InviteRow | null>;
/**
 * Atomically consume a single-use invite. Returns true only if THIS call
 * flipped it from unused -> used; a second concurrent call matches 0 rows.
 */
export declare function consumeInvite(client: TxClient, inviteId: string): Promise<boolean>;
/** Revoke an invite, scoped to the deal's owner. Returns true if revoked. */
export declare function revokeInvite(inviteId: string, sellerId: string, reason: string | null): Promise<boolean>;
export interface InviteSummaryRow {
    id: string;
    intended_user_hint: string | null;
    single_use: boolean;
    expires_at: string | null;
    used_at: string | null;
    revoked_at: string | null;
    created_at: string;
}
export declare function listInvitesForDeal(dealId: string, sellerId: string): Promise<InviteSummaryRow[]>;
export interface InviteDealRow {
    id: string;
    status: string;
    seller_id: string | null;
    buyer_id: string | null;
    coin: string;
    network: string;
    deal_amount: number | null;
}
/** Load a deal scoped to its creating party (null if not found / not a party).
 * The creator may be on EITHER side — when they chose to be the buyer the deal
 * has buyer_id = creator and seller_id NULL, so we match either slot. */
export declare function loadOwnedDeal(client: TxClient, dealId: string, sellerId: string): Promise<InviteDealRow | null>;
/** Load minimal deal facts for an invite recipient (no owner scope). */
export declare function loadDealForRecipient(dealId: string): Promise<InviteDealRow | null>;
/**
 * Atomically attach a buyer to a deal that has no buyer yet. Returns true only
 * if THIS call set the buyer (prevents two recipients claiming one deal, and
 * blocks the seller from joining their own deal).
 */
export declare function attachBuyer(client: TxClient, dealId: string, buyerId: string): Promise<boolean>;
/**
 * Atomically attach a SELLER to a deal that has no seller yet (used when the
 * deal's creator chose to be the buyer, leaving the seller slot open for the
 * invitee). Returns true only if THIS call set the seller.
 */
export declare function attachSeller(client: TxClient, dealId: string, sellerId: string): Promise<boolean>;
export interface SafetySnapshotInput {
    inviteId: string;
    counterpartyUserId: string | null;
    accountLabel: string | null;
    completedDealsCount: number | null;
    disputeRateBand: string | null;
    riskWarning: string | null;
}
export declare function insertInviteSafetySnapshot(client: TxClient, snap: SafetySnapshotInput): Promise<void>;
export interface CounterpartyStatsRow {
    username: string;
    account_label: string;
    completed: number;
}
/** Snapshot stats of a user shown to an invite recipient. */
export declare function loadCounterpartyStats(client: TxClient, userId: string): Promise<CounterpartyStatsRow | null>;
export declare function loadSnapshotForInvite(inviteId: string): Promise<SafetySnapshotInput | null>;
//# sourceMappingURL=invite.repository.d.ts.map