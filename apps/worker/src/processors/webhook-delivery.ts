import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { createHmac } from 'node:crypto';
import { assertSafeWebhookTarget } from '@trustvexa/api/worker-jobs';

export async function processWebhookDelivery(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = job.data as {
    webhookId: string;
    url: string;
    secret: string;
    eventType: string;
    payload: Record<string, unknown>;
  };

  const deliveryId = job.id || 'system';
  const nowIso = new Date().toISOString();

  const bodyObj = {
    id: deliveryId,
    event: data.eventType,
    payload: data.payload,
    created_at: nowIso,
  };

  const bodyStr = JSON.stringify(bodyObj);
  const signature = createHmac('sha256', data.secret).update(bodyStr).digest('hex');

  await assertSafeWebhookTarget(data.url);

  ctx.logger.info(
    { webhook_id: data.webhookId, url: data.url, event_type: data.eventType },
    'Delivering webhook...',
  );

  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;

  try {
    const res = await fetch(data.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TrustVexa-Signature': signature,
      },
      body: bodyStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = res.status;
    responseText = await res.text();
    success = res.ok;

    if (!success) {
      throw new Error(`Webhook returned status ${statusCode}: ${responseText.slice(0, 100)}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    responseText = responseText || errMsg || 'Unknown network error';
    ctx.logger.error(
      { webhook_id: data.webhookId, url: data.url, err: errMsg },
      'Webhook delivery failed',
    );
    throw err; // Throwing so BullMQ retries
  } finally {
    // Record log into webhook_logs table
    try {
      await ctx.db.query(
        `INSERT INTO webhook_logs (webhook_id, event_type, payload, status_code, response_body, success)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
        [
          data.webhookId,
          data.eventType,
          JSON.stringify(data.payload),
          statusCode,
          responseText ? responseText.slice(0, 1000) : null,
          success,
        ],
      );
    } catch (logErr) {
      ctx.logger.error({ logErr }, 'Failed to record webhook log entry to database');
    }
  }
}
