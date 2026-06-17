// Per-event sliding-window rate limit decision (task 6.1).
// Pure arithmetic over a window state that the gateway persists in Redis. The
// counter/window are advisory (rate limiting only), never durable money state.
// (Requirements 30.7)
/**
 * Fixed-window limiter: when the window has elapsed it resets, otherwise the
 * count increments until the limit is reached. Returns the next state so the
 * caller can persist it atomically.
 */
export function checkRateLimit(state, nowMs, limit, windowMs) {
    const fresh = state === null || nowMs - state.windowStartMs >= windowMs;
    const current = fresh ? { count: 0, windowStartMs: nowMs } : state;
    const resetMs = current.windowStartMs + windowMs;
    if (current.count >= limit) {
        return { allowed: false, remaining: 0, resetMs, next: current };
    }
    const next = { count: current.count + 1, windowStartMs: current.windowStartMs };
    return { allowed: true, remaining: Math.max(0, limit - next.count), resetMs, next };
}
//# sourceMappingURL=rate-limit.js.map