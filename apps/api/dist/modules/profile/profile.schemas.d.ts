/**
 * Zod schemas for the authenticated profile surface (task: profile REST).
 *
 * Preferences map 1:1 to the real `user_preferences` columns (timezone, locale,
 * theme, display_fiat). The PATCH is a partial, idempotent upsert: every field
 * is optional, unknown keys are rejected (`.strict()`), and omitted fields are
 * left untouched by the upsert. `theme` is constrained to the documented set.
 */
import { z } from 'zod';
export declare const themeSchema: z.ZodEnum<["light", "dark", "system"]>;
export declare const updatePreferencesSchema: z.ZodObject<{
    timezone: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
    theme: z.ZodOptional<z.ZodEnum<["light", "dark", "system"]>>;
    displayFiat: z.ZodOptional<z.ZodString>;
    emailDigestFrequency: z.ZodOptional<z.ZodEnum<["immediate", "daily", "weekly"]>>;
    quietHoursStart: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quietHoursEnd: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    profileVisibility: z.ZodOptional<z.ZodEnum<["public", "registered", "private"]>>;
    messagingPermission: z.ZodOptional<z.ZodEnum<["anyone", "counterparties", "nobody"]>>;
    showOnlineStatus: z.ZodOptional<z.ZodBoolean>;
    showCompletedDeals: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    timezone?: string | undefined;
    locale?: string | undefined;
    theme?: "system" | "light" | "dark" | undefined;
    displayFiat?: string | undefined;
    emailDigestFrequency?: "immediate" | "daily" | "weekly" | undefined;
    quietHoursStart?: string | null | undefined;
    quietHoursEnd?: string | null | undefined;
    profileVisibility?: "public" | "registered" | "private" | undefined;
    messagingPermission?: "anyone" | "counterparties" | "nobody" | undefined;
    showOnlineStatus?: boolean | undefined;
    showCompletedDeals?: boolean | undefined;
}, {
    timezone?: string | undefined;
    locale?: string | undefined;
    theme?: "system" | "light" | "dark" | undefined;
    displayFiat?: string | undefined;
    emailDigestFrequency?: "immediate" | "daily" | "weekly" | undefined;
    quietHoursStart?: string | null | undefined;
    quietHoursEnd?: string | null | undefined;
    profileVisibility?: "public" | "registered" | "private" | undefined;
    messagingPermission?: "anyone" | "counterparties" | "nobody" | undefined;
    showOnlineStatus?: boolean | undefined;
    showCompletedDeals?: boolean | undefined;
}>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export declare const updateProfileSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    avatarFileKey: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    username?: string | undefined;
    avatarFileKey?: string | undefined;
}, {
    username?: string | undefined;
    avatarFileKey?: string | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
//# sourceMappingURL=profile.schemas.d.ts.map