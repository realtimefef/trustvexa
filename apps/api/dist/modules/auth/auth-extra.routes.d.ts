/**
 * Additional auth-domain routers (tasks 3.6–3.10).
 *
 *  - recoveryRouter  → mounted at /auth     (verification, recovery, credential
 *                                            changes, step-up)
 *  - sessionsRouter  → mounted at /auth/sessions (device list + revoke + log)
 *  - accountRouter   → mounted at /account   (deactivate / reactivate / delete)
 *
 * Every route runs the fixed middleware chain (slot 5–9) via `apiChain`, so
 * validation, auth, role-guard, rate-limit and idempotency stay in the exact
 * normative order. (Requirement 44.3)
 */
import { Router } from 'express';
/** Verification, recovery, credential-change and step-up routes (mounted at /auth). */
export declare function recoveryRouter(): Router;
/** Session & device management + security log (mounted at /auth/sessions). */
export declare function sessionsRouter(): Router;
/** Account deactivation, reactivation, and deletion (mounted at /account). */
export declare function accountRouter(): Router;
//# sourceMappingURL=auth-extra.routes.d.ts.map