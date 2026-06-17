/**
 * Wallets feature router, mounted at `/api/v1/wallets` by the parent.
 *
 * Every route requires an authenticated account (roles `user` | `middleman`),
 * and the service layer scopes all reads/writes to the JWT user id so a caller
 * only ever touches their own saved wallets and change requests. Writes that
 * create rows (add address, create change request) enforce an Idempotency-Key
 * via the api chain and are idempotent in the service.
 */
import { Router } from 'express';
export declare function walletsRouter(): Router;
//# sourceMappingURL=wallets.routes.d.ts.map