/**
 * Referral program router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/referrals`.
 *
 * Both routes require an authenticated account (`user` | `middleman`) and the
 * service scopes everything to the JWT user id. Creating/getting the caller's
 * code enforces an Idempotency-Key at slot 9 and is idempotent (get-or-create).
 */
import { Router } from 'express';
export declare function referralsRouter(): Router;
//# sourceMappingURL=referrals.routes.d.ts.map