// SLA countdowns and breach detection (task 6.9).
// Pure time math used to emit `sla:tick` events and flag breaches. All inputs
// are ISO-8601 strings; outputs clamp at zero so a countdown never goes
// negative on the wire.
// (Requirements 36.3, 36.6, 36.7)

export interface SlaTick {
  remainingSeconds: number;
  breached: boolean;
  percentElapsed: number; // 0..100, clamped
}

/** Seconds remaining until the deadline, clamped to >= 0. */
export function remainingSeconds(deadlineIso: string, nowIso: string): number {
  const deadline = Date.parse(deadlineIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(deadline) || Number.isNaN(now)) return 0;
  return Math.max(0, Math.floor((deadline - now) / 1000));
}

/** True once the deadline has passed. */
export function isBreached(deadlineIso: string, nowIso: string): boolean {
  const deadline = Date.parse(deadlineIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(deadline) || Number.isNaN(now)) return false;
  return now >= deadline;
}

/** Build a full tick payload given the window's start and deadline. */
export function slaTick(startIso: string, deadlineIso: string, nowIso: string): SlaTick {
  const start = Date.parse(startIso);
  const deadline = Date.parse(deadlineIso);
  const now = Date.parse(nowIso);
  const remaining = remainingSeconds(deadlineIso, nowIso);
  const breached = isBreached(deadlineIso, nowIso);
  let percentElapsed = 0;
  if (!Number.isNaN(start) && !Number.isNaN(deadline) && deadline > start && !Number.isNaN(now)) {
    const elapsed = ((now - start) / (deadline - start)) * 100;
    percentElapsed = Math.min(100, Math.max(0, elapsed));
  } else if (breached) {
    percentElapsed = 100;
  }
  return { remainingSeconds: remaining, breached, percentElapsed };
}

/** Compute a deadline from a start time and an SLA duration in minutes. */
export function deadlineFrom(startIso: string, expectedMinutes: number): string {
  const start = Date.parse(startIso);
  return new Date(start + expectedMinutes * 60_000).toISOString();
}
