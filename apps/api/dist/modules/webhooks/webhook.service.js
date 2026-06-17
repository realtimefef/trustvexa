import { randomBytes } from 'node:crypto';
import { query } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { enqueueWebhookDelivery } from '../../lib/queue.js';
function toWebhook(row) {
    return {
        id: row.id,
        userId: row.user_id,
        url: row.url,
        secret: row.secret,
        events: row.events,
        active: row.active,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
}
export async function createWebhook(userId, input) {
    const secret = 'whsec_' + randomBytes(24).toString('hex');
    const res = await query(`INSERT INTO webhooks (user_id, url, secret, events, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, user_id, url, secret, events, active, created_at`, [userId, input.url, secret, input.events]);
    const row = res.rows[0];
    if (!row) {
        throw new AppError('database_error', 'Failed to create webhook subscription.', 500);
    }
    return toWebhook(row);
}
export async function listWebhooks(userId) {
    const res = await query(`SELECT id, user_id, url, secret, events, active, created_at
       FROM webhooks
      WHERE user_id = $1
      ORDER BY created_at DESC`, [userId]);
    return { webhooks: res.rows.map(toWebhook) };
}
export async function deleteWebhook(userId, id) {
    const res = await query(`DELETE FROM webhooks WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (res.rowCount === 0) {
        throw notFound('Webhook subscription not found.');
    }
}
/** Dispatches a webhook event payload asynchronously to all matching webhooks subscribing to it. */
export async function triggerWebhook(userId, eventType, payload) {
    const res = await query(`SELECT id, url, secret
       FROM webhooks
      WHERE user_id = $1 AND active = true AND $2 = ANY(events)`, [userId, eventType]);
    for (const hook of res.rows) {
        try {
            await enqueueWebhookDelivery({
                webhookId: hook.id,
                url: hook.url,
                secret: hook.secret,
                eventType,
                payload,
            });
        }
        catch (err) {
            console.error(`Failed to enqueue webhook delivery for webhook ${hook.id}:`, err);
        }
    }
}
//# sourceMappingURL=webhook.service.js.map