// SLA countdowns and breach detection (task 6.9).
// Pure time math used to emit `sla:tick` events and flag breaches. All inputs
// are ISO-8601 strings; outputs clamp at zero so a countdown never goes
// negative on the wire.
// (Requirements 36.3, 36.6, 36.7)
/** Seconds remaining until the deadline, clamped to >= 0. */
export function remainingSeconds(deadlineIso, nowIso) {
    const deadline = Date.parse(deadlineIso);
    const now = Date.parse(nowIso);
    if (Number.isNaN(deadline) || Number.isNaN(now))
        return 0;
    return Math.max(0, Math.floor((deadline - now) / 1000));
}
/** True once the deadline has passed. */
export function isBreached(deadlineIso, nowIso) {
    const deadline = Date.parse(deadlineIso);
    const now = Date.parse(nowIso);
    if (Number.isNaN(deadline) || Number.isNaN(now))
        return false;
    return now >= deadline;
}
/** Build a full tick payload given the window's start and deadline. */
export function slaTick(startIso, deadlineIso, nowIso) {
    const start = Date.parse(startIso);
    const deadline = Date.parse(deadlineIso);
    const now = Date.parse(nowIso);
    const remaining = remainingSeconds(deadlineIso, nowIso);
    const breached = isBreached(deadlineIso, nowIso);
    let percentElapsed = 0;
    if (!Number.isNaN(start) && !Number.isNaN(deadline) && deadline > start && !Number.isNaN(now)) {
        const elapsed = ((now - start) / (deadline - start)) * 100;
        percentElapsed = Math.min(100, Math.max(0, elapsed));
    }
    else if (breached) {
        percentElapsed = 100;
    }
    return { remainingSeconds: remaining, breached, percentElapsed };
}
/** Compute a deadline from a start time and an SLA duration in minutes. */
export function deadlineFrom(startIso, expectedMinutes) {
    const start = Date.parse(startIso);
    return new Date(start + expectedMinutes * 60_000).toISOString();
}
//# sourceMappingURL=sla.js.map