/**
 * Dashboard HTTP controllers (task 7.1).
 *
 * Thin translation between HTTP and the dashboard service. The authenticated
 * user id always comes from the verified JWT (`req.auth`), never from the
 * request, so a client cannot read another user's deals. Both routes are
 * read-only and return 200.
 */
import type { Request, Response } from 'express';
export declare function getDashboard(req: Request, res: Response): Promise<void>;
export declare function getDealDetail(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=dashboard.controller.d.ts.map