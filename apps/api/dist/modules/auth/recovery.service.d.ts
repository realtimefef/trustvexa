import type { ChangeEmailInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput, SetRecoveryEmailInput } from './auth.schemas.js';
/** Issue an email-verification token for the current user (delivered by the mailer). */
export declare function requestEmailVerification(userId: string): Promise<void>;
export declare function verifyEmail(token: string): Promise<void>;
/** Always succeeds to avoid leaking which emails are registered. */
export declare function forgotPassword(input: ForgotPasswordInput): Promise<void>;
export declare function resetPassword(input: ResetPasswordInput): Promise<void>;
export declare function changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
export declare function changeEmail(userId: string, input: ChangeEmailInput): Promise<void>;
export declare function setRecoveryEmail(userId: string, input: SetRecoveryEmailInput): Promise<void>;
export declare function acceptPolicy(userId: string, input: {
    docType: 'terms' | 'privacy';
    version: string;
}): Promise<void>;
//# sourceMappingURL=recovery.service.d.ts.map