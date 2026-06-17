/**
 * HTTP controller for recording cookie consent (task 8.3).
 *
 * The route is public, so the request may be anonymous; `req.auth?.userId` is
 * passed through (null when anonymous) and the opaque `visitorId` carries the
 * attribution in that case. Validation is handled by the Zod schema in the
 * middleware chain.
 */
import type { Request, Response } from 'express';
export declare function recordConsent(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=consent.controller.d.ts.map