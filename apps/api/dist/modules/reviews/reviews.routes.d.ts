/**
 * Reviews + trust feature router (task 7.6), mounted at `/api/v1/reviews`.
 *
 * - GET /users/:userId is public (rating + comment, no private identity) so a
 *   counterparty's reputation can be shown before a deal.
 * - GET /me/trust is restricted to signed-in accounts and returns only the
 *   caller's own trust restriction.
 */
import { Router } from 'express';
export declare function reviewsRouter(): Router;
//# sourceMappingURL=reviews.routes.d.ts.map