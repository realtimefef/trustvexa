/**
 * Handover HTTP controller (task 7.2). Read-only; the caller id comes from the
 * verified JWT and access is enforced in the service against the deal parties.
 */
import type { Request, Response } from 'express';
export declare function getDealHandover(req: Request, res: Response): Promise<void>;
export declare function revealHandoverItem(req: Request, res: Response): Promise<void>;
/**
 * Release one milestone (middleman-only, money-moving). Idempotency is enforced
 * by the route chain; the Idempotency-Key header is threaded into the
 * money-write contract.
 */
export declare function releaseMilestone(req: Request, res: Response): Promise<void>;
/** Mark a delivery-checklist item complete (middleman-only). */
export declare function markChecklistItem(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=handover.controller.d.ts.map