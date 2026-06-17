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
export declare function authRouter(): Router;
//# sourceMappingURL=auth.routes.d.ts.map