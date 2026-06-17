import type { AuthConfig } from './auth.config.js';
/** Account role, aligned with the `account_type` enum (user | middleman). */
export type AccountRole = 'user' | 'middleman';
export interface AccessClaims {
    sub: string;
    role: AccountRole;
    sid: string;
    type: 'access';
    jti: string;
    iat: number;
    exp: number;
}
export interface RefreshClaims {
    sub: string;
    sid: string;
    type: 'refresh';
    jti: string;
    iat: number;
    exp: number;
}
export interface IssuedToken {
    token: string;
    jti: string;
    expiresAt: Date;
}
export declare function issueAccessToken(params: {
    userId: string;
    role: AccountRole;
    sessionId: string;
}, cfg: AuthConfig): IssuedToken;
export declare function issueRefreshToken(params: {
    userId: string;
    sessionId: string;
}, cfg: AuthConfig): IssuedToken;
export declare function verifyAccessToken(token: string, cfg: AuthConfig): AccessClaims;
export declare function verifyRefreshToken(token: string, cfg: AuthConfig): RefreshClaims;
//# sourceMappingURL=jwt.d.ts.map