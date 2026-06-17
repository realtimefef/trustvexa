import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
export declare function requestMeta(req: Request): authService.RequestMeta;
export declare function sendAuthResult(res: Response, result: authService.AuthResult, status?: number): void;
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function refresh(req: Request, res: Response): Promise<void>;
/**
 * POST /auth/verify-session
 * Non-rotating session check.  Validates the refresh token without consuming
 * it, so the Next.js middleware can confirm auth on every page without racing
 * with client-side token rotation.
 */
export declare function verifySession(req: Request, res: Response): Promise<void>;
export declare function logout(req: Request, res: Response): Promise<void>;
export declare function logoutAll(req: Request, res: Response): Promise<void>;
export declare function me(req: Request, res: Response): void;
/** GET /auth/google — redirect the browser to Google's consent screen. */
export declare function googleStart(req: Request, res: Response): void;
/**
 * GET /auth/google/callback — finish the OAuth exchange, set the refresh
 * cookie, and bounce back to the web app with the access token in the URL
 * fragment (kept in client memory, never sent to the server again).
 */
export declare function googleCallback(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map