// Persistence for cookie consent records (task 8.3). consent_choices is stored
// as JSON; user_id is optional (anonymous visitors use visitor_id only).
// Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface CookieConsentRow {
  id: string;
  user_id: string | null;
  visitor_id: string;
  consent_choices: string;
  consented_at: string;
}

export async function recordConsent(
  tx: TxClient,
  input: { userId: string | null; visitorId: string; consentChoices: string },
): Promise<CookieConsentRow> {
  const { rows } = await tx.query<CookieConsentRow>(
    `INSERT INTO cookie_consents (user_id, visitor_id, consent_choices, consented_at)
		 VALUES ($1, $2, $3, now())
		 RETURNING id, user_id, visitor_id, consent_choices, consented_at`,
    [input.userId, input.visitorId, input.consentChoices],
  );
  const row = rows[0];
  if (!row) throw new Error('recordConsent returned no row');
  return row;
}

/** Most recent consent for a visitor (the effective choice). */
export async function latestConsent(
  tx: TxClient,
  visitorId: string,
): Promise<CookieConsentRow | null> {
  const { rows } = await tx.query<CookieConsentRow>(
    `SELECT id, user_id, visitor_id, consent_choices, consented_at
		 FROM cookie_consents WHERE visitor_id = $1
		 ORDER BY consented_at DESC LIMIT 1`,
    [visitorId],
  );
  return rows[0] ?? null;
}
