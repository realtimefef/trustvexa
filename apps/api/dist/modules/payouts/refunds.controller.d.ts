/**
 * Refunds HTTP controller (operator). The acting middleman id comes from the
 * verified JWT; the assigned-middleman authorization is enforced in the service.
 * The body is validated by `processRefundSchema` and the Idempotency-Key header
 * is threaded into the money-write.
 */
import type { Request, Response } from 'express';
/** POST /api/v1/refunds/by-deal/:id/process — process a deal refund. */
export declare function process(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=refunds.controller.d.ts.map