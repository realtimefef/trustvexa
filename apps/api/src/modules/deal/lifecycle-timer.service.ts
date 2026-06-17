/**
 * Lifecycle-timer engine (task 4.13, Requirement 14).
 *
 * Detects deals whose SLA windows have elapsed and drives the matching escrow
 * transition through `applyDealTransition`, so every timer-initiated change
 * obeys the same allow-list, optimistic locking, and hash-chained audit as a
 * user action. Timer transitions are recorded with a system actor (the audit
 * entry hashes a stable `'system'` label while `escrow_logs.actor_id` is NULL).
 *
 *   - Funding window elapsed   -> FundingWindowExpired (pre-funding auto-cancel, 14.9)
 *   - Completion clock elapsed  -> CompletionClockExpired, then lower the
 *     responsible seller's trust (14.2 / 14.3); naturally paused while disputed
 *     because a disputed deal is no longer `Funded` (14.5)
 *   - Inspection window elapsed -> InspectionWindowExpired -> auto-release to the
 *     seller (14.8)
 *
 * `runLifecycleTimers` takes an injected `now`, so the worker passes the real
 * clock while tests (task 4.14) pass a mocked one. Auto-refund of held funds on
 * expiry and auto-release payout movement are wired to the money-write contract
 * in task 5.26; this engine performs the authoritative state transitions and
 * the trust penalty.
 */
import { applyDealTransition } from './deal.service.js';
import * as timerRepo from './lifecycle-timer.repository.js';
import type { DealEvent } from './state-machine.js';

/** 3-day Completion_Clock (Requirement 14.1). */
export const COMPLETION_CLOCK_DAYS = 3;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function envHours(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

/**
 * Window durations. The plan fixes the completion clock at 3 days; the
 * inspection and funding windows are operationally tunable, so they default
 * here and may be overridden via the environment without a code change.
 */
export function inspectionWindowHours(): number {
  return envHours('INSPECTION_WINDOW_HOURS', 72);
}

export function fundingWindowHours(): number {
  return envHours('FUNDING_WINDOW_HOURS', 24);
}

export interface LifecycleTimerSummary {
  readonly fundingExpired: number;
  readonly completionExpired: number;
  readonly inspectionReleased: number;
  readonly trustLowered: number;
  readonly skipped: number;
  readonly failed: number;
}

export interface RunLifecycleTimersArgs {
  readonly now?: Date;
}

/** System transitions carry no user actor (NULL `escrow_logs.actor_id`). */
const SYSTEM_ACTOR: string | null = null;

function sweepRequestId(kind: string, dealId: string, nowIso: string): string {
  return `timer:${kind}:${dealId}:${nowIso}`;
}

/**
 * Outcome of one attempted timer transition. `applied` advanced the deal;
 * `skipped` means a concurrent writer already moved it or it is no longer in a
 * valid source state (expected and benign); `failed` is an unexpected error
 * that is counted but does not abort the sweep.
 */
type Outcome = 'applied' | 'skipped' | 'failed';

function errorCodeOf(err: unknown): string {
  return err && typeof err === 'object' && 'errorCode' in err
    ? String((err as { errorCode: unknown }).errorCode)
    : '';
}

async function tryTransition(
  dealId: string,
  event: DealEvent,
  kind: string,
  nowIso: string,
): Promise<Outcome> {
  try {
    await applyDealTransition({
      dealId,
      event,
      actorId: SYSTEM_ACTOR,
      requestId: sweepRequestId(kind, dealId, nowIso),
    });
    return 'applied';
  } catch (err) {
    const code = errorCodeOf(err);
    if (
      code === 'invalid_transition' ||
      code === 'concurrent_update' ||
      code === 'deal_not_found'
    ) {
      return 'skipped';
    }
    return 'failed';
  }
}

export async function runLifecycleTimers(
  args: RunLifecycleTimersArgs = {},
): Promise<LifecycleTimerSummary> {
  const now = args.now ?? new Date();
  const nowIso = now.toISOString();

  let fundingExpired = 0;
  let completionExpired = 0;
  let inspectionReleased = 0;
  let trustLowered = 0;
  let skipped = 0;
  let failed = 0;

  // 14.9 — pre-funding funding-window expiry.
  for (const deal of await timerRepo.findDueFundingWindowDeals(nowIso)) {
    const outcome = await tryTransition(deal.id, 'FundingWindowExpired', 'funding', nowIso);
    if (outcome === 'applied') fundingExpired += 1;
    else if (outcome === 'skipped') skipped += 1;
    else failed += 1;
  }

  // 14.2 / 14.3 — completion-clock expiry plus responsible-party trust penalty.
  for (const deal of await timerRepo.findDueCompletionClockDeals(nowIso)) {
    const outcome = await tryTransition(deal.id, 'CompletionClockExpired', 'completion', nowIso);
    if (outcome === 'applied') {
      completionExpired += 1;
      if (deal.seller_id !== null) {
        try {
          await timerRepo.lowerUserTrust(deal.seller_id);
          trustLowered += 1;
        } catch {
          failed += 1;
        }
      }
    } else if (outcome === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  // 14.8 — inspection-window auto-release to the seller.
  for (const deal of await timerRepo.findDueInspectionWindowDeals(nowIso)) {
    const outcome = await tryTransition(deal.id, 'InspectionWindowExpired', 'inspection', nowIso);
    if (outcome === 'applied') inspectionReleased += 1;
    else if (outcome === 'skipped') skipped += 1;
    else failed += 1;
  }

  return { fundingExpired, completionExpired, inspectionReleased, trustLowered, skipped, failed };
}

/** Start/refresh the funding window (14.9). */
export async function startFundingWindow(dealId: string, now: Date = new Date()): Promise<void> {
  const fundBy = new Date(now.getTime() + fundingWindowHours() * MS_PER_HOUR);
  await timerRepo.setFundingWindow(dealId, fundBy.toISOString());
}

/** Start the 3-day completion clock when the middleman is contacted (14.1). */
export async function startCompletionClock(dealId: string, now: Date = new Date()): Promise<void> {
  const completeBy = new Date(now.getTime() + COMPLETION_CLOCK_DAYS * MS_PER_DAY);
  await timerRepo.setCompletionClock(dealId, now.toISOString(), completeBy.toISOString());
}

/** Start the inspection window when the seller marks Delivered (14.6). */
export async function startInspectionWindow(dealId: string, now: Date = new Date()): Promise<void> {
  const until = new Date(now.getTime() + inspectionWindowHours() * MS_PER_HOUR);
  await timerRepo.setInspectionWindow(dealId, until.toISOString());
}
