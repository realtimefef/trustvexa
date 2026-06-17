import type { Request, Response } from 'express';
export declare function uploadFile(req: Request, res: Response): Promise<void>;
export declare function viewFile(req: Request, res: Response): Promise<void>;
/**
 * GET /storage/serve/:fileKey — serve a connection-chat image directly by
 * file_key (no attachment DB row required). Used for images uploaded via the
 * connection chat before a deal exists. Access requires a valid JWT only.
 */
export declare function serveFile(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=storage.controller.d.ts.map