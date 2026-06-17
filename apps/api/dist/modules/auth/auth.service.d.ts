import { type AccountRole } from './jwt.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
export interface RequestMeta {
    ip: string | null;
    userAgent: string | null;
}
export interface AuthTokens {
    accessToken: string;
    accessExpiresAt: Date;
    refreshToken: string;
    refreshExpiresAt: Date;
}
export interface PublicUser {
    id: string;
    username: string;
    role: AccountRole;
    accountStatus: string;
    accountLabel: string;
    totpEnabled: boolean;
}
export interface AuthResult {
    user: PublicUser;
    tokens: AuthTokens;
}
/** Intermediate result returned when a user has TOTP enabled. */
export interface TotpChallengeResult {
    totp_required: true;
    email: string;
}
export type LoginResult = AuthResult | TotpChallengeResult;
export declare function register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult>;
export declare function login(input: LoginInput, meta: RequestMeta): Promise<LoginResult>;
export declare function verifyTOTPAndLogin(input: {
    email: string;
    password: string;
    code: string;
    rememberMe?: boolean;
}, meta: RequestMeta): Promise<AuthResult>;
export declare function refresh(refreshToken: string, _meta: RequestMeta): Promise<AuthResult>;
/**
 * Verify that a refresh token is valid and the session is active, WITHOUT
 * rotating/consuming the token.  Used by the Next.js middleware for
 * non-destructive auth checks so that client-side token rotation still works.
 */
export declare function verifySession(refreshToken: string): Promise<PublicUser>;
export declare function logout(refreshToken: string | undefined, accessJti: string | null, accessExp: number | null): Promise<void>;
export declare function logoutAll(userId: string): Promise<void>;
/**
 * Google OAuth login (task 3.3, Requirement 2.2). Resolves the Google identity
 * to a local user (login / link / create) and opens a session using the exact
 * same `establishSession` flow as password login, so the resulting tokens and
 * cookies are identical.
 */
export declare function loginWithGoogle(args: {
    code: string;
    state: string;
}, meta: RequestMeta): Promise<AuthResult & {
    isNewAccount: boolean;
}>;
//# sourceMappingURL=auth.service.d.ts.map