// Web push subscription persistence (task 6.9). Thin repository over
// push_subscriptions. Injected transactional client; not barrel-exported; runs
// only against a real DB.
// (Requirement 36.4)

export interface PushTxClient {
  query<R>(text: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface PushSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  device?: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

export async function saveSubscription(
  client: PushTxClient,
  input: PushSubscriptionInput,
): Promise<PushSubscriptionRow> {
  const res = await client.query<PushSubscriptionRow>(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, device)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, user_id, endpoint, p256dh_key, auth_key`,
    [input.userId, input.endpoint, input.p256dhKey, input.authKey, input.device ?? null],
  );
  const row = res.rows[0];
  if (!row) throw new Error('failed to save push subscription');
  return row;
}

/** Revoke a subscription (e.g. on logout or 410 Gone from the push service). */
export async function revokeSubscription(client: PushTxClient, endpoint: string): Promise<void> {
  await client.query(
    `UPDATE push_subscriptions SET revoked_at = now() WHERE endpoint = $1 AND revoked_at IS NULL`,
    [endpoint],
  );
}

/** List a user's active (non-revoked) subscriptions for fan-out. */
export async function activeSubscriptions(
  client: PushTxClient,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const res = await client.query<PushSubscriptionRow>(
    `SELECT id, user_id, endpoint, p256dh_key, auth_key
		   FROM push_subscriptions
		  WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
  return res.rows;
}
