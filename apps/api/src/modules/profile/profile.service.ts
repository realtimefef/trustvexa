import { query } from '@trustvexa/shared';

import { AppError, notFound } from '../../errors/app-error.js';
import type { UpdatePreferencesInput, UpdateProfileInput } from './profile.schemas.js';
import { openPii } from '../crypto/key-provider.js';

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface MyProfile {
  username: string;
  accountLabel: string;
  trustLevel: number;
  accountStatus: string;
  createdAt: string;
  avatarUrl?: string | null;
}

interface UserRow {
  username: string;
  account_label: string;
  trust_level: number;
  account_status: string;
  created_at: Date | string;
  avatar_file_key: string | null;
}

/** The caller's own profile. Never returns password_hash or another user's row. */
export async function getMyProfile(userId: string): Promise<MyProfile> {
  const res = await query<UserRow>(
    `SELECT username, account_label, trust_level, account_status, created_at, avatar_file_key
       FROM users
      WHERE id = $1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) {
    throw notFound('User not found.');
  }
  return {
    username: row.username,
    accountLabel: row.account_label,
    trustLevel: row.trust_level,
    accountStatus: row.account_status,
    createdAt: toIso(row.created_at),
    avatarUrl: row.avatar_file_key ? `/api/v1/public/avatar/${userId}` : null,
  };
}

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

interface PreferencesRow {
  timezone: string | null;
  locale: string | null;
  theme: string | null;
  display_fiat: string | null;
  email_digest_frequency: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  profile_visibility: string | null;
  messaging_permission: string | null;
  show_online_status: boolean | null;
  show_completed_deals: boolean | null;
}

const EMPTY_PREFERENCES: UserPreferences = {
  timezone: null,
  locale: null,
  theme: null,
  displayFiat: null,
  emailDigestFrequency: 'immediate',
  quietHoursStart: null,
  quietHoursEnd: null,
  recoveryEmail: null,
  profileVisibility: 'public',
  messagingPermission: 'anyone',
  showOnlineStatus: true,
  showCompletedDeals: true,
};

/** Read the caller's preferences; returns nulls when none have been saved yet. */
export async function getPreferences(userId: string): Promise<UserPreferences> {
  const res = await query<PreferencesRow>(
    `SELECT p.timezone, p.locale, p.theme, p.display_fiat, p.email_digest_frequency,
            p.profile_visibility, p.messaging_permission, p.show_online_status, p.show_completed_deals,
            n.quiet_hours_start, n.quiet_hours_end
       FROM user_preferences p
  LEFT JOIN notification_global_settings n ON n.user_id = p.user_id
      WHERE p.user_id = $1`,
    [userId],
  );

  const userRes = await query<{ recovery_email_enc: string | null }>(
    `SELECT recovery_email_enc FROM users WHERE id = $1`,
    [userId],
  );
  let recoveryEmail: string | null = null;
  if (userRes.rows[0]?.recovery_email_enc) {
    recoveryEmail = await openPii(userRes.rows[0].recovery_email_enc);
  }

  const row = res.rows[0];
  if (!row) {
    const nRes = await query<{ quiet_hours_start: string | null; quiet_hours_end: string | null }>(
      `SELECT quiet_hours_start, quiet_hours_end FROM notification_global_settings WHERE user_id = $1`,
      [userId],
    );
    const nRow = nRes.rows[0];
    return {
      ...EMPTY_PREFERENCES,
      quietHoursStart: nRow?.quiet_hours_start ?? null,
      quietHoursEnd: nRow?.quiet_hours_end ?? null,
      recoveryEmail,
    };
  }
  return {
    timezone: row.timezone,
    locale: row.locale,
    theme: row.theme,
    displayFiat: row.display_fiat,
    emailDigestFrequency: row.email_digest_frequency,
    quietHoursStart: row.quiet_hours_start ?? null,
    quietHoursEnd: row.quiet_hours_end ?? null,
    recoveryEmail,
    profileVisibility: row.profile_visibility ?? 'public',
    messagingPermission: row.messaging_permission ?? 'anyone',
    showOnlineStatus: row.show_online_status ?? true,
    showCompletedDeals: row.show_completed_deals ?? true,
  };
}

/**
 * Idempotent partial upsert of the caller's preferences. Relies on
 * UNIQUE(user_id) for the conflict target; omitted fields are kept as-is via
 * COALESCE so a PATCH never clobbers values it did not include.
 */
export async function upsertPreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<UserPreferences> {
  await query(
    `INSERT INTO user_preferences (user_id, timezone, locale, theme, display_fiat, email_digest_frequency,
                                   profile_visibility, messaging_permission, show_online_status, show_completed_deals)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id) DO UPDATE SET
       timezone = COALESCE(EXCLUDED.timezone, user_preferences.timezone),
       locale = COALESCE(EXCLUDED.locale, user_preferences.locale),
       theme = COALESCE(EXCLUDED.theme, user_preferences.theme),
       display_fiat = COALESCE(EXCLUDED.display_fiat, user_preferences.display_fiat),
       email_digest_frequency = COALESCE(EXCLUDED.email_digest_frequency, user_preferences.email_digest_frequency),
       profile_visibility = COALESCE(EXCLUDED.profile_visibility, user_preferences.profile_visibility),
       messaging_permission = COALESCE(EXCLUDED.messaging_permission, user_preferences.messaging_permission),
       show_online_status = COALESCE(EXCLUDED.show_online_status, user_preferences.show_online_status),
       show_completed_deals = COALESCE(EXCLUDED.show_completed_deals, user_preferences.show_completed_deals)`,
    [
      userId,
      input.timezone ?? null,
      input.locale ?? null,
      input.theme ?? null,
      input.displayFiat ?? null,
      input.emailDigestFrequency ?? null,
      input.profileVisibility ?? null,
      input.messagingPermission ?? null,
      input.showOnlineStatus ?? null,
      input.showCompletedDeals ?? null,
    ],
  );

  if ('quietHoursStart' in input || 'quietHoursEnd' in input) {
    const qStart = input.quietHoursStart === undefined ? undefined : input.quietHoursStart;
    const qEnd = input.quietHoursEnd === undefined ? undefined : input.quietHoursEnd;

    const checkSettings = await query<{
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    }>(
      `SELECT quiet_hours_start, quiet_hours_end FROM notification_global_settings WHERE user_id = $1`,
      [userId],
    );

    if (checkSettings.rows.length === 0) {
      await query(
        `INSERT INTO notification_global_settings (user_id, quiet_hours_start, quiet_hours_end)
         VALUES ($1, $2, $3)`,
        [userId, qStart ?? null, qEnd ?? null],
      );
    } else {
      const existing = checkSettings.rows[0]!;
      const nextStart = qStart === undefined ? existing.quiet_hours_start : qStart;
      const nextEnd = qEnd === undefined ? existing.quiet_hours_end : qEnd;
      await query(
        `UPDATE notification_global_settings
            SET quiet_hours_start = $2,
                quiet_hours_end = $3
          WHERE user_id = $1`,
        [userId, nextStart, nextEnd],
      );
    }
  }

  return getPreferences(userId);
}

/** Update the caller's own profile. Checks for duplicate username. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<MyProfile> {
  if (input.username) {
    const res = await query(`SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2`, [
      input.username,
      userId,
    ]);
    if (res.rows.length > 0) {
      throw new AppError('username_taken', 'That username is already taken.', 409);
    }
  }

  await query(
    `UPDATE users
        SET username = COALESCE($2, username),
            avatar_file_key = COALESCE($3, avatar_file_key),
            updated_at = now()
      WHERE id = $1`,
    [userId, input.username ?? null, input.avatarFileKey ?? null],
  );

  return getMyProfile(userId);
}

export async function updateAvatarUrl(userId: string, avatarFileKey: string): Promise<void> {
  await query(
    `UPDATE users
        SET avatar_file_key = $2,
            updated_at = now()
      WHERE id = $1`,
    [userId, avatarFileKey],
  );
}
