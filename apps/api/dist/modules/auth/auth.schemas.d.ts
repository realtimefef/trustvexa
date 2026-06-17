/**
 * Shared Zod schemas for auth endpoints (task 3.2).
 *
 * The same definitions are used by the middleware (slot 5 validation) and can
 * be re-exported to the client so both validate identically. Registration is
 * open (no invite) and must capture the 18+, Terms, and Privacy confirmations.
 * (Requirements 1.1, 1.2, 1.3, 1.6, 1.9, 2.1)
 */
import { z } from 'zod';
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const usernameSchema: z.ZodString;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    username: z.ZodString;
    isAdult: z.ZodLiteral<true>;
    acceptTerms: z.ZodLiteral<true>;
    acceptPrivacy: z.ZodLiteral<true>;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    username: string;
    isAdult: true;
    acceptTerms: true;
    acceptPrivacy: true;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    username: string;
    isAdult: true;
    acceptTerms: true;
    acceptPrivacy: true;
    rememberMe?: boolean | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string | undefined;
}, {
    refreshToken?: string | undefined;
}>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export declare const verifyEmailSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export declare const changeEmailSchema: z.ZodObject<{
    newEmail: z.ZodString;
    currentPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newEmail: string;
}, {
    currentPassword: string;
    newEmail: string;
}>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export declare const setRecoveryEmailSchema: z.ZodObject<{
    recoveryEmail: z.ZodString;
    currentPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    recoveryEmail: string;
}, {
    currentPassword: string;
    recoveryEmail: string;
}>;
export type SetRecoveryEmailInput = z.infer<typeof setRecoveryEmailSchema>;
export declare const stepUpSchema: z.ZodObject<{
    actionType: z.ZodString;
    dealId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    dealId?: string | undefined;
}, {
    actionType: string;
    dealId?: string | undefined;
}>;
export type StepUpInput = z.infer<typeof stepUpSchema>;
export declare const confirmStepUpSchema: z.ZodObject<{
    token: z.ZodString;
    actionType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    actionType: string;
}, {
    token: string;
    actionType: string;
}>;
export type ConfirmStepUpInput = z.infer<typeof confirmStepUpSchema>;
export declare const accountActionSchema: z.ZodObject<{
    password: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    password: string;
    reason?: string | undefined;
}, {
    password: string;
    reason?: string | undefined;
}>;
export type AccountActionInput = z.infer<typeof accountActionSchema>;
export declare const acceptPolicySchema: z.ZodObject<{
    docType: z.ZodEnum<["terms", "privacy"]>;
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    docType: "terms" | "privacy";
    version: string;
}, {
    docType: "terms" | "privacy";
    version: string;
}>;
export type AcceptPolicyInput = z.infer<typeof acceptPolicySchema>;
//# sourceMappingURL=auth.schemas.d.ts.map