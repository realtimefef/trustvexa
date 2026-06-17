import { getRedis } from '@trustvexa/shared';
import { AppError } from '../errors/app-error.js';
const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX = 120;
const DEFAULT_PREFIX = 'rl';
// In-process fallback: Map<key, { count: number; resetAt: number }>
const inMemoryCounters = new Map();
function inMemoryIncr(key, windowSeconds) {
    const now = Date.now();
    const entry = inMemoryCounters.get(key);
    if (!entry || now >= entry.resetAt) {
        inMemoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return 1;
    }
    entry.count += 1;
    return entry.count;
}
function clientId(req) {
    if (req.auth?.userId) {
        return `u:${req.auth.userId}`;
    }
    const forwarded = req.headers['x-forwarded-for'];
    const headerIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
    return `ip:${headerIp || req.ip || 'unknown'}`;
}
export function rateLimiter(options = {}) {
    const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
    const max = options.max ?? DEFAULT_MAX;
    const prefix = options.prefix ?? DEFAULT_PREFIX;
    const failClosed = options.failClosed ?? false;
    return (req, res, next) => {
        void (async () => {
            const route = `${req.baseUrl}${req.route?.path ?? req.path}`;
            const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
            const key = `${prefix}:${route}:${clientId(req)}:${windowId}`;
            try {
                const redis = getRedis();
                const count = await redis.incr(key);
                if (count === 1) {
                    await redis.expire(key, windowSeconds);
                }
                const remaining = Math.max(0, max - count);
                res.setHeader('RateLimit-Limit', String(max));
                res.setHeader('RateLimit-Remaining', String(remaining));
                res.setHeader('RateLimit-Reset', String((windowId + 1) * windowSeconds));
                if (count > max) {
                    res.setHeader('Retry-After', String(windowSeconds));
                    throw new AppError('rate_limited', 'Too many requests. Please slow down and try again shortly.', 429);
                }
                next();
            }
            catch (err) {
                if (err instanceof AppError) {
                    next(err);
                    return;
                }
                if (failClosed) {
                    // Redis is down — use the in-process fallback to keep brute-force
                    // protection active for auth/financial endpoints.
                    const count = inMemoryIncr(key, windowSeconds);
                    res.setHeader('RateLimit-Limit', String(max));
                    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - count)));
                    res.setHeader('RateLimit-Reset', String((windowId + 1) * windowSeconds));
                    if (count > max) {
                        res.setHeader('Retry-After', String(windowSeconds));
                        next(new AppError('rate_limited', 'Too many requests. Please slow down and try again shortly.', 429));
                        return;
                    }
                    next();
                    return;
                }
                // Fail open on Redis/runtime errors for non-critical routes.
                next();
            }
        })();
    };
}
//# sourceMappingURL=rate-limit.js.map