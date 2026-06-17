/**
 * Zod schemas for secure seller invites (task 4.3, Requirements 8.1-8.5).
 */
import { z } from 'zod';
/** Create an invite for a deal. */
export declare const createInviteSchema: z.ZodObject<{
    intendedUserHint: z.ZodOptional<z.ZodString>;
    expiresInHours: z.ZodOptional<z.ZodNumber>;
    singleUse: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    intendedUserHint?: string | undefined;
    expiresInHours?: number | undefined;
    singleUse?: boolean | undefined;
}, {
    intendedUserHint?: string | undefined;
    expiresInHours?: number | undefined;
    singleUse?: boolean | undefined;
}>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export declare const inviteTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type InviteTokenInput = z.infer<typeof inviteTokenSchema>;
export declare const revokeInviteSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export type RevokeInviteInput = z.infer<typeof revokeInviteSchema>;
export declare const inviteIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
//# sourceMappingURL=invite.schemas.d.ts.map