// Dispute resolution + settlement math (task 7.5). Pure: the middleman's
// outcome (full refund / full release / partial split) is converted into an
// exact integer split of the escrow that ALWAYS balances (toBuyer + toSeller
// === escrow). The resulting deal event is routed through the existing state
// machine and money-write contract by the service layer.
// (Requirements 24.1-24.7)

import type { DealEvent } from '../deal/state-machine.js';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'cancelled';
export type DisputeOutcome = 'full_refund' | 'full_release' | 'partial_split';

export interface SettlementSplit {
  /** Smallest-unit amount routed back to the buyer (refund). */
  toBuyer: bigint;
  /** Smallest-unit amount routed to the seller (release). */
  toSeller: bigint;
}

export type SettlementError =
  | 'escrow_not_positive'
  | 'buyer_share_required'
  | 'buyer_share_out_of_range';

export class SettlementValidationError extends Error {
  constructor(public readonly reason: SettlementError) {
    super(`settlement_invalid:${reason}`);
    this.name = 'SettlementValidationError';
  }
}

export interface SettlementRequest {
  escrowAmount: bigint;
  outcome: DisputeOutcome;
  /** Required only for partial_split: smallest-unit amount returned to buyer. */
  buyerShare?: bigint;
}

/** Compute the exact split for a settlement. Throws on invalid inputs. */
export function computeSettlement(req: SettlementRequest): SettlementSplit {
  if (req.escrowAmount <= 0n) throw new SettlementValidationError('escrow_not_positive');
  switch (req.outcome) {
    case 'full_refund':
      return { toBuyer: req.escrowAmount, toSeller: 0n };
    case 'full_release':
      return { toBuyer: 0n, toSeller: req.escrowAmount };
    case 'partial_split': {
      if (req.buyerShare === undefined) throw new SettlementValidationError('buyer_share_required');
      if (req.buyerShare < 0n || req.buyerShare > req.escrowAmount) {
        throw new SettlementValidationError('buyer_share_out_of_range');
      }
      return { toBuyer: req.buyerShare, toSeller: req.escrowAmount - req.buyerShare };
    }
  }
}

/** Invariant guard: a settlement must fully and non-negatively distribute escrow. */
export function settlementBalances(escrowAmount: bigint, split: SettlementSplit): boolean {
  return (
    split.toBuyer >= 0n && split.toSeller >= 0n && split.toBuyer + split.toSeller === escrowAmount
  );
}

/** Map a resolved outcome to the deal-state-machine event that effects it. */
export function resolutionEvent(outcome: DisputeOutcome): DealEvent {
  switch (outcome) {
    case 'full_refund':
      return 'ResolveFullRefund';
    case 'full_release':
      return 'ResolveFullRelease';
    case 'partial_split':
      return 'ResolvePartialSplit';
  }
}

/** Only a middleman may resolve, and only from an active dispute status. */
export function canResolveDispute(status: DisputeStatus, isMiddleman: boolean): boolean {
  return isMiddleman && (status === 'open' || status === 'under_review');
}

export interface EvidenceRecord {
  id: string;
  fileHash: string | null;
  lockedAt: string | null;
}

/** Evidence is hashed and locked at upload; locked evidence is immutable (Req 24.3). */
export function isEvidenceLocked(evidence: EvidenceRecord): boolean {
  return evidence.lockedAt !== null;
}

export function canModifyEvidence(evidence: EvidenceRecord): boolean {
  return !isEvidenceLocked(evidence);
}
