/**
 * Worker-facing entry point (task 4.13).
 *
 * The BullMQ worker (`@trustvexa/worker`) imports the lifecycle-timer engine
 * through the `@trustvexa/api/deal-lifecycle` subpath export so SLA-timer
 * transitions route through the very same deal service the HTTP API uses
 * (shared allow-list, optimistic locking, and hash-chained audit). Keep this
 * surface small: only what the worker schedules and the deal module needs to
 * start timer windows.
 */
export {
  runLifecycleTimers,
  startFundingWindow,
  startCompletionClock,
  startInspectionWindow,
  inspectionWindowHours,
  fundingWindowHours,
  COMPLETION_CLOCK_DAYS,
} from './modules/deal/lifecycle-timer.service.js';
export type {
  LifecycleTimerSummary,
  RunLifecycleTimersArgs,
} from './modules/deal/lifecycle-timer.service.js';
export { applyDealTransition } from './modules/deal/deal.service.js';
