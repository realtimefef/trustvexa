// Per-event sliding-window rate limit decision (task 6.1).
// Pure arithmetic over a window state that the gateway persists in Redis. The
// counter/window are advisory (rate limiting only), never durable money state.
// (Requirements 30.7)

export interface WindowState {
  count: number;
  windowStartMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  next: WindowState;
}

/**
 * Fixed-window limiter: when the window has elapsed it resets, otherwise the
 * count increments until the limit is reached. Returns the next state so the
 * caller can persist it atomically.
 */
export function checkRateLimit(
  state: WindowState | null,
  nowMs: number,
  limit: number,
  windowMs: number,
): RateLimitDecision {
  const fresh = state === null || nowMs - state.windowStartMs >= windowMs;
  const current: WindowState = fresh ? { count: 0, windowStartMs: nowMs } : state;
  const resetMs = current.windowStartMs + windowMs;
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetMs, next: current };
  }
  const next: WindowState = { count: current.count + 1, windowStartMs: current.windowStartMs };
  return { allowed: true, remaining: Math.max(0, limit - next.count), resetMs, next };
}
