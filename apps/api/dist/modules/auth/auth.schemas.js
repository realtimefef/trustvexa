/**
 * Shared Zod schemas for auth endpoints (task 3.2).
 *
 * The same definitions are used by the middleware (slot 5 validation) and can
 * be re-exported to the client so both validate identically. Registration is
 * open (no invite) and must capture the 18+, Terms, and Privacy confirmations.
 * (Requirements 1.1, 1.2, 1.3, 1.6, 1.9, 2.1)
 */
import { z } from 'zod';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password.js';
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);
export const usernameSchema = z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.');
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema,
    isAdult: z.literal(true),
    acceptTerms: z.literal(true),
    acceptPrivacy: z.literal(true),
    rememberMe: z.boolean().optional(),
});
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    rememberMe: z.boolean().optional(),
});
export const refreshSchema = z.object({
    refreshToken: z.string().min(1).optional(),
});
// --- task 3.6 / 3.7: verification, recovery & credential-change schemas ---
export const verifyEmailSchema = z.object({
    token: z.string().min(10).max(512),
});
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});
export const resetPasswordSchema = z.object({
    token: z.string().min(10).max(512),
    password: passwordSchema,
});
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    newPassword: passwordSchema,
});
export const changeEmailSchema = z.object({
    newEmail: emailSchema,
    currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});
export const setRecoveryEmailSchema = z.object({
    recoveryEmail: emailSchema,
    currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});
// --- task 3.6: step-up confirmation schemas ---
export const stepUpSchema = z.object({
    actionType: z.string().min(1).max(64),
    dealId: z.string().uuid().optional(),
});
export const confirmStepUpSchema = z.object({
    token: z.string().min(6).max(512),
    actionType: z.string().min(1).max(64),
});
// --- task 3.10: account deactivation / deletion ---
export const accountActionSchema = z.object({
    password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    reason: z.string().max(500).optional(),
});
export const acceptPolicySchema = z.object({
    docType: z.enum(['terms', 'privacy']),
    version: z.string().min(1).max(64),
});
//# sourceMappingURL=auth.schemas.js.map