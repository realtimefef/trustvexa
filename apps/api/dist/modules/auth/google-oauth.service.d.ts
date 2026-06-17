import { type UserRecord } from './auth.repository.js';
export interface ResolvedGoogleUser {
    user: UserRecord;
    isNewAccount: boolean;
}
/**
 * Validate state + exchange code + resolve the local account for a Google
 * callback. Returns the resolved `UserRecord`; the caller issues the session.
 */
export declare function resolveGoogleUser(args: {
    code: string;
    state: string;
}): Promise<ResolvedGoogleUser>;
//# sourceMappingURL=google-oauth.service.d.ts.map