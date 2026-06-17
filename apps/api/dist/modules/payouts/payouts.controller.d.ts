/**
 * Payouts HTTP controller (operator). The acting middleman id comes from the
 * verified JWT; the assigned-middleman authorization is enforced in the service
 * against the deal's `middleman_id`. The Idempotency-Key header is threaded into
 * the money-write for the state-changing endpoints.
 */
import type { Request, Response } from 'express';
/** GET /api/v1/payouts/queue — pending/approved payouts for this middleman. */
export declare function getQueue(req: Request, res: Response): Promise<void>;
/** POST /api/v1/payouts/:payoutId/approve — first control signature. */
export declare function approve(req: Request, res: Response): Promise<void>;
/** POST /api/v1/payouts/:payoutId/broadcast — second control signature. */
export declare function broadcast(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=payouts.controller.d.ts.map