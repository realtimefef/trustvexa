import './types/http.js';

import express, { type Express } from 'express';
import { API_PREFIX } from '@trustvexa/shared';

import { bodyParse } from './middleware/body-parse.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { securityHeaders } from './middleware/security-headers.js';
import { HealthController } from './controllers/health.controller.js';
import { apiRouter } from './routes/index.js';

/**
 * Builds the Express application with the fixed middleware stack in its exact,
 * normative order (Requirement 44.3):
 *
 *   1. Security headers (helmet / CSP, + HSTS, X-Frame-Options,
 *      X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — 44.6
 *   2. CORS
 *   3. Request ID + structured logging
 *   4. Body parse
 *   --- per-route (applied inside the router via apiChain) ---
 *   5. Zod validation
 *   6. JWT auth        (verify Bearer access token, jti denylist)
 *   7. Role guard      (server-side role authorization)
 *   8. Rate limiter    (Redis fixed-window, RateLimit-* headers, 429)
 *   9. Idempotency-Key (presence; replay/serialization via runMoneyWrite)
 *   10. Handler
 *   --- after the router ---
 *   11. Centralized error handler -> envelope { error_code, message, request_id }
 */
export function createApp(): Express {
  const app = express();

  // Trust the edge/proxy (Render/Cloudflare) so HTTPS + client IP are correct.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Slot 1 — security headers (helmet/CSP + Permissions-Policy).
  app.use(...securityHeaders());
  // Slot 2 — CORS.
  app.use(corsMiddleware());
  // Slot 3 — request id + structured logging.
  app.use(requestContext());
  // Slot 4 — body parse.
  app.post('/api/v1/storage/upload', express.raw({ limit: '50mb', type: '*/*' }));
  app.use(bodyParse());

  // Platform health check (Requirement 45.8). Mounted at the root, after request
  // id + structured logging so the probe is correlated, but before the API
  // router so it bypasses auth / rate limiting / idempotency. Render uses this
  // as the web/api health check. Returns 200 when healthy, 503 when degraded.
  const healthController = new HealthController();
  app.get('/healthz', (req, res) => {
    void healthController.healthz(req, res);
  });

  // Slots 5–10 run inside the router (validation -> jwt -> role -> rate limit
  // -> idempotency -> handler), mounted under the /api/v1 prefix.
  app.use(API_PREFIX, apiRouter());

  // No route matched -> structured 404 through the error handler.
  app.use(notFoundHandler());

  // Slot 11 — centralized error handler (must be registered last).
  app.use(errorHandler());

  return app;
}
