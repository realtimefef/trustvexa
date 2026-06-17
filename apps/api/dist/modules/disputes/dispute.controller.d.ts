/**
 * Dispute HTTP controller (task 7.5). Read-only; the caller id comes from the
 * verified JWT and access is enforced in the service against the deal's
 * parties.
 */
import type { Request, Response } from 'express';
export declare function getByDeal(req: Request, res: Response): Promise<void>;
/**
 * Resolve a deal's open dispute (middleman-only, money-moving). The body is
 * validated by `resolveDisputeSchema`; idempotency is enforced by the route
 * chain and the Idempotency-Key header is threaded into the money-write.
 */
export declare function resolve(req: Request, res: Response): Promise<void>;
/**
 * Open a dispute on a Funded/Delivered deal as a party (buyer/seller). The body
 * carries the category and an optional opening statement; idempotency is
 * enforced by the route chain and the Idempotency-Key header is threaded into
 * the state-changing money-write. (Requirement 24.1)
 */
export declare function open(req: Request, res: Response): Promise<void>;
/** List a dispute's thread messages for a party or the assigned middleman. */
export declare function listMessages(req: Request, res: Response): Promise<void>;
/** Post a statement to a dispute thread (party or assigned middleman). */
export declare function postMessage(req: Request, res: Response): Promise<void>;
/** Register an evidence record (hashed and locked at upload). */
export declare function registerEvidence(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=dispute.controller.d.ts.map