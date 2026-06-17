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
export declare function checkRateLimit(state: WindowState | null, nowMs: number, limit: number, windowMs: number): RateLimitDecision;
//# sourceMappingURL=rate-limit.d.ts.map