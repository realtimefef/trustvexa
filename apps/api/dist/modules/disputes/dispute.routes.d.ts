/**
 * Disputes feature router (task 7.5), mounted at `/api/v1/disputes`. Read-only
 * view of a deal's dispute, available to either party or the assigned
 * middleman; access is enforced in the service. No Idempotency-Key is enforced
 * because there are no writes here.
 */
import { Router } from 'express';
export declare function disputeRouter(): Router;
//# sourceMappingURL=dispute.routes.d.ts.map