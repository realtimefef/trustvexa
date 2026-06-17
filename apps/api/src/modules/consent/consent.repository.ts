/**
 * Data access for cookie-consent records (task 8.3, Requirement 42.8).
 *
 * A single parameterized INSERT into `cookie_consents`. `consent_choices` is a
 * JSONB column, so the choices object is serialized to JSON. `user_id` is null
 * for anonymous visitors (attributed by the opaque `visitor_id` instead).
 */
import { query } from '@trustvexa/shared';

import type { ConsentChoices } from './consent.schemas.js';

export interface CookieConsentRow {
  id: string;
  consented_at: Date | string | null;
  created_at: Date | string;
}

export interface InsertCookieConsentParams {
  userId: string | null;
  visitorId: string | null;
  choices: ConsentChoices;
}

export async function insertCookieConsent(
  params: InsertCookieConsentParams,
): Promise<CookieConsentRow> {
  const res = await query<CookieConsentRow>(
    `INSERT INTO cookie_consents (user_id, visitor_id, consent_choices, consented_at)
     VALUES ($1, $2, $3::jsonb, now())
     RETURNING id, consented_at, created_at`,
    [params.userId, params.visitorId, JSON.stringify(params.choices)],
  );
  return res.rows[0] as CookieConsentRow;
}
