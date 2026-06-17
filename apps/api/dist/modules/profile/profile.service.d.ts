import type { UpdatePreferencesInput, UpdateProfileInput } from './profile.schemas.js';
export interface MyProfile {
    username: string;
    accountLabel: string;
    trustLevel: number;
    accountStatus: string;
    createdAt: string;
    avatarUrl?: string | null;
}
/** The caller's own profile. Never returns password_hash or another user's row. */
export declare function getMyProfile(userId: string): Promise<MyProfile>;
export interface UserPreferences {
    timezone: string | null;
    locale: string | null;
    theme: string | null;
    displayFiat: string | null;
    emailDigestFrequency: string | null;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    recoveryEmail?: string | null;
    profileVisibility: string | null;
    messagingPermission: string | null;
    showOnlineStatus: boolean | null;
    showCompletedDeals: boolean | null;
}
/** Read the caller's preferences; returns nulls when none have been saved yet. */
export declare function getPreferences(userId: string): Promise<UserPreferences>;
/**
 * Idempotent partial upsert of the caller's preferences. Relies on
 * UNIQUE(user_id) for the conflict target; omitted fields are kept as-is via
 * COALESCE so a PATCH never clobbers values it did not include.
 */
export declare function upsertPreferences(userId: string, input: UpdatePreferencesInput): Promise<UserPreferences>;
/** Update the caller's own profile. Checks for duplicate username. */
export declare function updateProfile(userId: string, input: UpdateProfileInput): Promise<MyProfile>;
export declare function updateAvatarUrl(userId: string, avatarFileKey: string): Promise<void>;
//# sourceMappingURL=profile.service.d.ts.map