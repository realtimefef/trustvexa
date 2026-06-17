/**
 * Chat history HTTP controllers (read-only REST). The caller is always derived
 * from the verified JWT (never from the path or body), and the chat id comes
 * from the Zod-validated path. Access decisions live in the service, which
 * returns the opaque 404 for chats the caller may not read.
 */
import type { Request, Response } from 'express';
export declare function listChats(req: Request, res: Response): Promise<void>;
export declare function listMessages(req: Request, res: Response): Promise<void>;
export declare function postMessage(req: Request, res: Response): Promise<void>;
export declare function editMessage(req: Request, res: Response): Promise<void>;
export declare function deleteMessage(req: Request, res: Response): Promise<void>;
export declare function searchMessages(req: Request, res: Response): Promise<void>;
export declare function getDraft(req: Request, res: Response): Promise<void>;
export declare function saveDraft(req: Request, res: Response): Promise<void>;
export declare function markReceipts(req: Request, res: Response): Promise<void>;
export declare function updateSettings(req: Request, res: Response): Promise<void>;
export declare function addReaction(req: Request, res: Response): Promise<void>;
export declare function removeReaction(req: Request, res: Response): Promise<void>;
export declare function pinMessage(req: Request, res: Response): Promise<void>;
export declare function unpinMessage(req: Request, res: Response): Promise<void>;
export declare function forwardMessage(req: Request, res: Response): Promise<void>;
export declare function listPinnedMessages(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=chat.controller.d.ts.map