/**
 * Pure decision helpers for amendments and mutual cancellation (task 4.8,
 * Requirement 12). Side-effect free so they can be property-tested and reused
 * by the service without a database.
 *
 *  - A change request needs BOTH parties' approval (12.1); money/product
 *    changes additionally need the middleman (12.2).
 *  - A mutual cancellation needs both parties' approval (12.4); a single
 *    refusal is routed to the middleman (12.5).
 *  - Whether a deal is still pre-funding decides mutual-cancel vs. the
 *    refund/dispute flow (12.6).
 */

/** Change types whose approval additionally requires the middleman (12.2). */
export const MONEY_PRODUCT_CHANGE_TYPES = [
  'amount',
  'product',
  'fee_payer',
  'coin',
  'network',
] as const;

export const CHANGE_TYPES = [
  'amount',
  'product',
  'fee_payer',
  'coin',
  'network',
  'terms',
  'inspection_window',
  'other',
] as const;

export type ChangeType = (typeof CHANGE_TYPES)[number];

export function requiresMiddlemanApproval(changeType: string): boolean {
  return (MONEY_PRODUCT_CHANGE_TYPES as readonly string[]).includes(changeType);
}

export interface AmendmentApprovalState {
  buyerApprovedAt: string | null;
  sellerApprovedAt: string | null;
  middlemanApprovedAt: string | null;
}

export function isAmendmentFullyApproved(
  approval: AmendmentApprovalState,
  needsMiddleman: boolean,
): boolean {
  const bothParties = approval.buyerApprovedAt != null && approval.sellerApprovedAt != null;
  if (!needsMiddleman) {
    return bothParties;
  }
  return bothParties && approval.middlemanApprovedAt != null;
}

export interface CancellationApprovalState {
  buyerApprovedAt: string | null;
  sellerApprovedAt: string | null;
}

export function isCancellationMutuallyApproved(approval: CancellationApprovalState): boolean {
  return approval.buyerApprovedAt != null && approval.sellerApprovedAt != null;
}

/** Statuses before any on-chain funds are held. */
export const PRE_FUNDING_STATUSES = [
  'Created',
  'Invited',
  'Agreed',
  'Verified',
  'Confirmed',
] as const;

/** Funded-or-later but still active statuses → cancellation routes to dispute (12.6). */
export const FUNDED_ACTIVE_STATUSES = [
  'Funded',
  'SellerHandover',
  'MiddlemanVerified',
  'Delivered',
  'Approved',
  'PayoutQueued',
  'MilestoneReleased',
  'Disputed',
] as const;

export function isPreFunding(status: string): boolean {
  return (PRE_FUNDING_STATUSES as readonly string[]).includes(status);
}

export function isFundedActive(status: string): boolean {
  return (FUNDED_ACTIVE_STATUSES as readonly string[]).includes(status);
}
