import type { TxClient } from './deal.repository.js';
import type { DealRole } from './terms.repository.js';
export interface AmendmentDealRow {
    id: string;
    status: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
}
export declare function loadDealForAmendment(dealId: string): Promise<AmendmentDealRow | null>;
export interface AmendmentRow {
    id: string;
    deal_id: string;
    requested_by: string | null;
    change_type: string | null;
    old_value: string | null;
    new_value: string | null;
    buyer_approved_at: string | null;
    seller_approved_at: string | null;
    middleman_approved_at: string | null;
    status: string | null;
    created_at: string;
}
export declare function insertAmendment(client: TxClient, params: {
    dealId: string;
    requestedBy: string;
    changeType: string;
    oldValue: string | null;
    newValue: string;
}): Promise<{
    id: string;
}>;
export declare function getAmendment(dealId: string, amendmentId: string): Promise<AmendmentRow | null>;
export declare function getAmendmentForUpdate(client: TxClient, dealId: string, amendmentId: string): Promise<AmendmentRow | null>;
export declare function listAmendments(dealId: string): Promise<AmendmentRow[]>;
export declare function approveAmendmentRole(client: TxClient, amendmentId: string, role: DealRole): Promise<void>;
export declare function setAmendmentStatus(client: TxClient, amendmentId: string, status: string): Promise<void>;
export interface CancellationRow {
    id: string;
    deal_id: string;
    requested_by: string | null;
    buyer_approved_at: string | null;
    seller_approved_at: string | null;
    middleman_decision: string | null;
    reason: string | null;
    status: string | null;
    created_at: string;
}
export declare function insertCancellation(client: TxClient, params: {
    dealId: string;
    requestedBy: string;
    reason: string | null;
    status: string;
}): Promise<{
    id: string;
}>;
export declare function getCancellation(dealId: string, cancellationId: string): Promise<CancellationRow | null>;
export declare function getCancellationForUpdate(client: TxClient, dealId: string, cancellationId: string): Promise<CancellationRow | null>;
export declare function listCancellations(dealId: string): Promise<CancellationRow[]>;
export declare function approveCancellationRole(client: TxClient, cancellationId: string, role: 'buyer' | 'seller'): Promise<void>;
export declare function setCancellationStatus(client: TxClient, cancellationId: string, status: string): Promise<void>;
export declare function setCancellationMiddlemanDecision(client: TxClient, cancellationId: string, decision: string, status: string): Promise<void>;
//# sourceMappingURL=amendment.repository.d.ts.map