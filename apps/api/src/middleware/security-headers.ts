import type { RequestHandler } from 'express';
import helmet from 'helmet';

/**
 * Middleware slot 1 — Security headers (helmet / CSP).
 *
 * Applies the HTTP security headers required by Requirement 44.6:
 *   - Strict-Transport-Security (HSTS)
 *   - Content-Security-Policy (CSP)
 *   - X-Frame-Options
 *   - X-Content-Type-Options
 *   - Referrer-Policy
 *   - Permissions-Policy
 *
 * helmet sets HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and
 * Referrer-Policy. helmet does not set Permissions-Policy, so it is added
 * explicitly below. (Requirements 44.3 slot 1, 44.6)
 */
export function securityHeaders(): RequestHandler[] {
  const helmetMiddleware = helmet({
    // Explicit Content-Security-Policy. A locked-down default that later tasks
    // (frontend wiring) can extend per route as needed.
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    // Strict-Transport-Security (HSTS): 2 years, include subdomains, preload.
    hsts: {
      maxAge: 63_072_000,
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options: DENY (defense in depth alongside frame-ancestors).
    frameguard: { action: 'deny' },
    // Referrer-Policy.
    referrerPolicy: { policy: 'no-referrer' },
    // X-Content-Type-Options: nosniff is enabled by helmet's noSniff (default).
  });

  // helmet does not emit Permissions-Policy; set a restrictive default here.
  const permissionsPolicy: RequestHandler = (_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );
    next();
  };

  return [helmetMiddleware, permissionsPolicy];
}
