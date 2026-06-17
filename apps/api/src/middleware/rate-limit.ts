import type { RequestHandler } from 'express';

import { getRedis } from '@trustvexa/shared';

import { AppError } from '../errors/app-error.js';

/**
 * Middleware slot 8 — Redis fixed-window rate limiter (task 3.9,
 * Requirements 33.1–33.3, 44.3/44.4).
 *
 * Counts requests per (route, client) inside a fixed time window using a Redis
 * counter (INCR + EXPIRE). Emits the standard `RateLimit-*` headers and rejects
 * with HTTP 429 + `Retry-After` once the budget is exceeded.
 *
 * Fail-open vs fail-closed behaviour:
 *   - When `failClosed` is false (default, global routes): fails open so an
 *     infrastructure blip never takes the whole API down.
 *   - When `failClosed` is true (auth/financial routes): falls back to an
 *     in-process sliding-window map so rate limits remain active during a Redis
 *     outage. (Audit FIX-P1-5)
 *
 * Authenticated callers are keyed by user id (after slot 6); anonymous callers
 * by client IP (honouring `X-Forwarded-For` behind the Render proxy).
 */
export interface RateLimitOptions {
  /** Window length in seconds (default 60). */
  windowSeconds?: number;
  /** Max requests allowed per window (default 120). */
  max?: number;
  /** Redis key prefix (default 'rl'). */
  prefix?: string;
  /**
   * When true, fall back to an in-process rate-limit counter when Redis is
   * unavailable rather than failing open. Use for auth/financial endpoints
   * where brute-force protection must remain active even during Redis outages.
   * Default: false.
   */
  failClosed?: boolean;
}

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX = 120;
const DEFAULT_PREFIX = 'rl';

// In-process fallback: Map<key, { count: number; resetAt: number }>
const inMemoryCounters = new Map<string, { count: number; resetAt: number }>();

function inMemoryIncr(key: string, windowSeconds: number): number {
  const now = Date.now();
  const entry = inMemoryCounters.get(key);
  if (!entry || now >= entry.resetAt) {
    inMemoryCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

function clientId(req: Parameters<RequestHandler>[0]): string {
  if (req.auth?.userId) {
    return `u:${req.auth.userId}`;
  }
  const forwarded = req.headers['x-forwarded-for'];
  const headerIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  return `ip:${headerIp || req.ip || 'unknown'}`;
}

export function rateLimiter(options: RateLimitOptions = {}): RequestHandler {
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
          throw new AppError(
            'rate_limited',
            'Too many requests. Please slow down and try again shortly.',
            429,
          );
        }
        next();
      } catch (err) {
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
