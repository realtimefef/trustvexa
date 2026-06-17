/**
 * HTTP controller for the public contact form (task 8.3).
 *
 * Thin translation between HTTP and the contact service. The route is public,
 * so there is no auth context to read; validation is handled by the Zod schema
 * in the middleware chain.
 */
import type { Request, Response } from 'express';
export declare function submit(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=contact.controller.d.ts.map