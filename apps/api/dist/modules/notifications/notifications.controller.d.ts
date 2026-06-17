/**
 * Notifications HTTP controllers. Each handler derives the acting user from the
 * verified JWT (via `requireUserId`) so a caller can only read or mutate their
 * own notifications, preferences, and push subscriptions — a user id is never
 * read from the request body or query. Validated input is shaped by the slot-5
 * Zod schemas in notifications.schemas.ts.
 */
import type { Request, Response } from 'express';
export declare function listNotifications(req: Request, res: Response): Promise<void>;
export declare function markRead(req: Request, res: Response): Promise<void>;
export declare function markAllRead(req: Request, res: Response): Promise<void>;
export declare function getPreferences(req: Request, res: Response): Promise<void>;
export declare function upsertPreference(req: Request, res: Response): Promise<void>;
export declare function subscribePush(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=notifications.controller.d.ts.map