/**
 * Treasury feature router (task 7.4), mounted at `/api/v1/treasury`. Read-only,
 * `middleman`-only views over reconciliation snapshots; no Idempotency-Key is
 * enforced because there are no writes.
 */
import { Router } from 'express';
export declare function treasuryRouter(): Router;
//# sourceMappingURL=treasury.routes.d.ts.map