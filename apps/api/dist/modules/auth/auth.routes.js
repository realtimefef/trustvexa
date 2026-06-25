/**
 * Auth feature router (task 3.2), mounted at `/api/v1/auth`.
 *
 * Every route runs the fixed per-route chain (validation -> jwt -> role guard
 * -> rate limit -> idempotency) via `apiChain`. register/login/refresh/logout
 * are public (no role required); logout-all and me require an authenticated
 * account. Google OAuth (`/google` + `/google/callback`, task 3.3) is public
 * and runs only when operator-provided GCP credentials are present in the
 * environment (the handlers throw on startup config if they are missing).
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './auth.controller.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas.js';
export function authRouter() {
    const router = Router();
    router.post('/register', ...apiChain({
        schemas: { body: registerSchema },
        // SEC-HIGH-1 FIX: failClosed:true keeps brute-force protection active
        // even during a Redis outage by falling back to in-process counters.
        rateLimit: { windowSeconds: 3600, max: 40, failClosed: true },
    }), asyncHandler(controller.register));
    router.post('/login', ...apiChain({
        schemas: { body: loginSchema },
        rateLimit: { windowSeconds: 900, max: 30, failClosed: true },
    }), asyncHandler(controller.login));
    router.post('/refresh', ...apiChain({
        schemas: { body: refreshSchema },
        rateLimit: { windowSeconds: 60, max: 60, failClosed: true },
    }), asyncHandler(controller.refresh));
    router.post('/verify-session', ...apiChain(), asyncHandler(controller.verifySession));
    router.post('/logout', ...apiChain(), asyncHandler(controller.logout));
    router.post('/logout-all', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.logoutAll));
    router.get('/me', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.me));
    // Google OAuth (task 3.3). Only registered when operator has configured GCP credentials.
    // Disabled when GOOGLE_OAUTH_CLIENT_ID is not set to avoid startup errors.
    if (process.env.GOOGLE_OAUTH_CLIENT_ID) {
        router.get('/google', ...apiChain(), asyncHandler(controller.googleStart));
        router.get('/google/callback', ...apiChain(), asyncHandler(controller.googleCallback));
    }
    return router;
}
//# sourceMappingURL=auth.routes.js.map