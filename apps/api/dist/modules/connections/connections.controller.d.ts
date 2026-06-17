/**
 * Connections HTTP controllers. The caller is always taken from the verified
 * JWT; a non-participant gets the opaque 404 from the service.
 */
import type { Request, Response } from 'express';
export declare function createConnection(req: Request, res: Response): Promise<void>;
export declare function joinConnection(req: Request, res: Response): Promise<void>;
export declare function listConnections(req: Request, res: Response): Promise<void>;
export declare function getConnection(req: Request, res: Response): Promise<void>;
export declare function listMessages(req: Request, res: Response): Promise<void>;
export declare function postMessage(req: Request, res: Response): Promise<void>;
/** POST /connections/contact-middleman — one-click middleman chat (no code needed). */
export declare function contactMiddleman(req: Request, res: Response): Promise<void>;
/** DELETE /connections/:id — close (archive) a connection. */
export declare function closeConnection(req: Request, res: Response): Promise<void>;
/** POST /connections/:id/invite-middleman — bring a middleman into an existing buyer↔seller chat. */
export declare function inviteMiddleman(req: Request, res: Response): Promise<void>;
/** DELETE /connections/:id/messages/:msgId — soft-delete a single message (sender only). */
export declare function deleteMessage(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=connections.controller.d.ts.map