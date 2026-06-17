// Graduated trust enforcement (task 7.6). Pure mapping from a user's
// missed-deadline count (and an optional fraud signal) to the restriction that
// applies. Server-authoritative, no I/O. Backs Property 22.
// (Requirements 26.1-26.10)

export const ACCOUNT_LABELS = [
  'new_user',
  'good_standing',
  'trusted',
  'high_risk',
  'under_review',
  'blocked',
  'middleman_verified',
] as const;
export type AccountLabel = (typeof ACCOUNT_LABELS)[number];

export const RESTRICTION_KINDS = [
  'none',
  'warning',
  'soft_limit',
  'temporary_block',
  'manual_review_block',
] as const;
export type RestrictionKind = (typeof RESTRICTION_KINDS)[number];

export const SOFT_LIMIT_MAX_ACTIVE_DEALS = 1;
export const SOFT_LIMIT_COOLDOWN_HOURS = 24;
export const TEMPORARY_BLOCK_DAYS = 7;

export interface TrustRestriction {
  kind: RestrictionKind;
  missedDeadlineCount: number;
  /** True when the user may not open new deals at all. */
  blockNewDeals: boolean;
  /** Cap on simultaneous active deals; null means unlimited. */
  maxActiveDeals: number | null;
  cooldownHours: number | null;
  temporaryBlockDays: number | null;
  /** True when only a middleman can lift the restriction. */
  requiresMiddlemanReinstate: boolean;
}

export interface RestrictionInput {
  missedDeadlineCount: number;
  fraud?: boolean;
}

function manualReviewBlock(count: number): TrustRestriction {
  return {
    kind: 'manual_review_block',
    missedDeadlineCount: count,
    blockNewDeals: true,
    maxActiveDeals: 0,
    cooldownHours: null,
    temporaryBlockDays: null,
    requiresMiddlemanReinstate: true,
  };
}

/**
 * Resolve the restriction for a given missed-deadline count.
 *  - 0 misses: none
 *  - 1st miss: friendly warning only (Req 26.2)
 *  - 2nd miss: soft limit of one active deal + short cooldown (Req 26.3)
 *  - 3rd miss: temporary ~7-day block on new deals (Req 26.4)
 *  - 4th miss or fraud: block until a middleman reinstates (Req 26.5)
 */
export function restrictionFor(input: RestrictionInput): TrustRestriction {
  const count = Number.isFinite(input.missedDeadlineCount)
    ? Math.max(0, Math.trunc(input.missedDeadlineCount))
    : 0;
  if (input.fraud === true) return manualReviewBlock(count);
  switch (count) {
    case 0:
      return {
        kind: 'none',
        missedDeadlineCount: count,
        blockNewDeals: false,
        maxActiveDeals: null,
        cooldownHours: null,
        temporaryBlockDays: null,
        requiresMiddlemanReinstate: false,
      };
    case 1:
      return {
        kind: 'warning',
        missedDeadlineCount: count,
        blockNewDeals: false,
        maxActiveDeals: null,
        cooldownHours: null,
        temporaryBlockDays: null,
        requiresMiddlemanReinstate: false,
      };
    case 2:
      return {
        kind: 'soft_limit',
        missedDeadlineCount: count,
        blockNewDeals: false,
        maxActiveDeals: SOFT_LIMIT_MAX_ACTIVE_DEALS,
        cooldownHours: SOFT_LIMIT_COOLDOWN_HOURS,
        temporaryBlockDays: null,
        requiresMiddlemanReinstate: false,
      };
    case 3:
      return {
        kind: 'temporary_block',
        missedDeadlineCount: count,
        blockNewDeals: true,
        maxActiveDeals: 0,
        cooldownHours: null,
        temporaryBlockDays: TEMPORARY_BLOCK_DAYS,
        requiresMiddlemanReinstate: false,
      };
    default:
      return manualReviewBlock(count);
  }
}

/** Relative severity, used to assert monotonic escalation. */
export function severityRank(kind: RestrictionKind): number {
  switch (kind) {
    case 'none':
      return 0;
    case 'warning':
      return 1;
    case 'soft_limit':
      return 2;
    case 'temporary_block':
      return 3;
    case 'manual_review_block':
      return 4;
  }
}

/** The consequence the user is warned about before the next miss (Req 26.8). */
export function nextConsequence(currentMissedCount: number): TrustRestriction {
  const base = Number.isFinite(currentMissedCount)
    ? Math.max(0, Math.trunc(currentMissedCount))
    : 0;
  return restrictionFor({ missedDeadlineCount: base + 1 });
}

/** Whether a user may open a new deal given the active restriction. */
export function canCreateDeal(restriction: TrustRestriction, currentActiveDeals: number): boolean {
  if (restriction.blockNewDeals) return false;
  if (restriction.maxActiveDeals !== null) return currentActiveDeals < restriction.maxActiveDeals;
  return true;
}

export type AppealDecision = 'reinstate' | 'keep_blocked' | 'cooldown';

export interface AppealOutcome {
  blockNewDeals: boolean;
  cooldownHours: number | null;
  resolvedLabel: AccountLabel;
}

/** Apply the single controlled appeal decision recorded by the middleman (Req 26.10). */
export function applyAppeal(decision: AppealDecision, cooldownHours?: number): AppealOutcome {
  switch (decision) {
    case 'reinstate':
      return { blockNewDeals: false, cooldownHours: null, resolvedLabel: 'good_standing' };
    case 'keep_blocked':
      return { blockNewDeals: true, cooldownHours: null, resolvedLabel: 'blocked' };
    case 'cooldown':
      return {
        blockNewDeals: false,
        cooldownHours: cooldownHours ?? SOFT_LIMIT_COOLDOWN_HOURS,
        resolvedLabel: 'under_review',
      };
  }
}
