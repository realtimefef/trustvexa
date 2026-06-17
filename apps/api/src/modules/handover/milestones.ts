// Handover, milestone release, and delivery checklists (task 7.2). Pure logic
// that gates the state machine: a milestone may only be released when its
// checklist is satisfied, and total released never exceeds the escrow.
// (Requirements 40.1-40.6)

export type RevealStatus = 'middleman_only' | 'revealed_to_buyer' | 'revoked';

export interface ChecklistItem {
  code: string;
  required: boolean;
  done: boolean;
}

/** A checklist is satisfied when every required item is done. */
export function isChecklistComplete(items: ReadonlyArray<ChecklistItem>): boolean {
  return items.every((i) => !i.required || i.done);
}

export function pendingRequired(items: ReadonlyArray<ChecklistItem>): ChecklistItem[] {
  return items.filter((i) => i.required && !i.done);
}

export interface Milestone {
  id: string;
  amount: bigint;
  released: boolean;
}

export type MilestoneReleaseError =
  | 'already_released'
  | 'checklist_incomplete'
  | 'not_middleman'
  | 'exceeds_escrow';

export interface MilestoneReleaseInput {
  milestone: Milestone;
  checklist: ReadonlyArray<ChecklistItem>;
  isMiddleman: boolean;
  escrowAmount: bigint;
  alreadyReleased: bigint;
}

export interface MilestoneReleaseDecision {
  ok: boolean;
  error?: MilestoneReleaseError;
  /** Cumulative released amount if this release proceeds. */
  nextReleasedTotal: bigint;
  /** True when this release exhausts the escrow (final milestone). */
  isFinal: boolean;
}

export function evaluateMilestoneRelease(input: MilestoneReleaseInput): MilestoneReleaseDecision {
  const nextTotal = input.alreadyReleased + input.milestone.amount;
  const base = { nextReleasedTotal: input.alreadyReleased, isFinal: false };
  if (!input.isMiddleman) return { ok: false, error: 'not_middleman', ...base };
  if (input.milestone.released) return { ok: false, error: 'already_released', ...base };
  if (!isChecklistComplete(input.checklist)) {
    return { ok: false, error: 'checklist_incomplete', ...base };
  }
  if (nextTotal > input.escrowAmount) return { ok: false, error: 'exceeds_escrow', ...base };
  return { ok: true, nextReleasedTotal: nextTotal, isFinal: nextTotal === input.escrowAmount };
}

/** Buyer may see revealed credentials only after the middleman reveals them. */
export function canBuyerReveal(status: RevealStatus): boolean {
  return status === 'revealed_to_buyer';
}
