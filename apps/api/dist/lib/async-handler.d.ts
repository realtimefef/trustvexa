import type { NextFunction, Request, RequestHandler, Response } from 'express';
/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * centralized error handler (Express 4 does not catch async errors itself).
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void): RequestHandler;
//# sourceMappingURL=async-handler.d.ts.map