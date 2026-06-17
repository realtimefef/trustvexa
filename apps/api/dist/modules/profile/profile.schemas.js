/**
 * Zod schemas for the authenticated profile surface (task: profile REST).
 *
 * Preferences map 1:1 to the real `user_preferences` columns (timezone, locale,
 * theme, display_fiat). The PATCH is a partial, idempotent upsert: every field
 * is optional, unknown keys are rejected (`.strict()`), and omitted fields are
 * left untouched by the upsert. `theme` is constrained to the documented set.
 */
import { z } from 'zod';
export const themeSchema = z.enum(['light', 'dark', 'system']);
export const updatePreferencesSchema = z
    .object({
    timezone: z.string().trim().min(1).max(64).optional(),
    locale: z.string().trim().min(2).max(35).optional(),
    theme: themeSchema.optional(),
    displayFiat: z.string().trim().min(3).max(8).optional(),
    emailDigestFrequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
    quietHoursStart: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format')
        .optional()
        .nullable(),
    quietHoursEnd: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format')
        .optional()
        .nullable(),
    // Privacy / profile visibility (GAP-4)
    profileVisibility: z.enum(['public', 'registered', 'private']).optional(),
    messagingPermission: z.enum(['anyone', 'counterparties', 'nobody']).optional(),
    showOnlineStatus: z.boolean().optional(),
    showCompletedDeals: z.boolean().optional(),
})
    .strict();
export const updateProfileSchema = z
    .object({
    username: z
        .string()
        .trim()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.')
        .optional(),
    avatarFileKey: z.string().trim().max(1024).optional(),
})
    .strict();
//# sourceMappingURL=profile.schemas.js.map