import type { DealStatus } from '../deal/state-machine.js';
/** A row from `deals` projected for dashboard/detail reads. */
export interface DealRow {
    id: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    coin: string;
    network: string;
    network_mode: string;
    is_practice: boolean;
    deal_amount: string | null;
    amount_coin: string | null;
    amount_smallest_unit: string | null;
    locked_fx_rate: string | null;
    fx_source: string | null;
    price_tolerance_pct: string | null;
    fee_payer: string | null;
    platform_fee: string | null;
    seller_settlement_fee: string | null;
    transaction_fee: string | null;
    buyer_total: string | null;
    seller_payout: string | null;
    status: DealStatus;
    hold_status: string | null;
    legal_hold: boolean;
    attempt_no: number;
    risk_score: number | null;
    fund_by: Date | string | null;
    complete_by: Date | string | null;
    inspection_until: Date | string | null;
    last_activity_at: Date | string | null;
    version_no: number;
    created_at: Date | string;
    updated_at: Date | string;
}
/** All deals the user is a party to, most-recently-active first. */
export declare function listDealsForUser(userId: string): Promise<DealRow[]>;
/** A single deal, but only if the user is a party to it (else `null`). */
export declare function getDealForUser(dealId: string, userId: string): Promise<DealRow | null>;
/** A hash-chained escrow-log row projected for the activity timeline. */
export interface TimelineRow {
    action: string;
    from_state: string | null;
    to_state: string | null;
    visibility: 'user' | 'middleman_only';
    actor_id: string | null;
    created_at: Date | string;
}
/**
 * The deal's audit timeline. `middleman_only` rows are included only when the
 * caller is the middleman; buyers and sellers see `user`-visible rows only
 * (Requirement 36.1 visibility split).
 */
export declare function loadTimeline(dealId: string, includeMiddlemanOnly: boolean): Promise<TimelineRow[]>;
//# sourceMappingURL=deal-read.repository.d.ts.map