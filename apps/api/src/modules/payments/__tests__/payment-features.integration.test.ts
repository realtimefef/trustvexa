import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closePool, query } from '@trustvexa/shared';
import { submitPaymentTx, confirmPaymentChecklist } from '../payment.service.js';

const HAS_DB = Boolean(process.env.DATABASE_URL);
const d = HAS_DB ? describe : describe.skip;

async function insertUser(role: 'user' | 'middleman'): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO users (username, account_type) VALUES ($1, $2) RETURNING id`,
    [`u_${randomUUID().slice(0, 12)}`, role],
  );
  return res.rows[0]!.id;
}

async function insertDeal(input: {
  buyer: string;
  seller: string;
  middleman: string;
  status: string;
  amount: bigint;
}): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO deals (buyer_id, seller_id, middleman_id, coin, network, status, amount_smallest_unit)
     VALUES ($1, $2, $3, 'USDT', 'TRON', $4::deal_status, $5) RETURNING id`,
    [input.buyer, input.seller, input.middleman, input.status, input.amount.toString()],
  );
  return res.rows[0]!.id;
}

d('Payment Features (DB-backed)', () => {
  let buyer = '';
  let seller = '';
  let middleman = '';

  beforeAll(async () => {
    buyer = await insertUser('user');
    seller = await insertUser('user');
    middleman = await insertUser('middleman');
  });

  afterAll(async () => {
    await closePool();
  });

  it('enforces 15-minute payment quote expiry on tx-hash submission', async () => {
    const dealId = await insertDeal({
      buyer,
      seller,
      middleman,
      status: 'Confirmed',
      amount: 1000n,
    });
    const idempotencyKey = randomUUID();

    // 1. Submit within 15 minutes should succeed
    const res1 = await submitPaymentTx({
      buyerId: buyer,
      dealId,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      idempotencyKey,
    });
    expect(res1.recorded).toBe(true);
    expect(res1.txHash).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');

    // 2. Manually backdate the deal to be older than 15 minutes (e.g. 16 minutes)
    await query(`UPDATE deals SET created_at = now() - interval '16 minutes' WHERE id = $1`, [
      dealId,
    ]);

    // Submit after 15 minutes should throw quote_expired
    const submitPromise = submitPaymentTx({
      buyerId: buyer,
      dealId,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      idempotencyKey: randomUUID(),
    });

    await expect(submitPromise).rejects.toThrowError(/quote.*expired/i);
  });

  it('records before-you-pay safety screen confirmation in payment_status_events', async () => {
    const dealId = await insertDeal({
      buyer,
      seller,
      middleman,
      status: 'Confirmed',
      amount: 1000n,
    });
    const idempotencyKey = randomUUID();

    const res = await confirmPaymentChecklist({
      buyerId: buyer,
      dealId,
      idempotencyKey,
    });
    expect(res.recorded).toBe(true);
    expect(res.eventId).toBeDefined();

    // Verify it was written to payment_status_events
    const eventQuery = await query<{ status_step: string; message: string }>(
      `SELECT status_step, message FROM payment_status_events WHERE id = $1`,
      [res.eventId],
    );
    expect(eventQuery.rows[0]?.status_step).toBe('payment_checklist_confirmed');

    const parsedMessage = JSON.parse(eventQuery.rows[0]?.message);
    expect(parsedMessage.items).toContain('coin_network');
    expect(parsedMessage.items).toContain('exact_amount');
    expect(parsedMessage.items).toContain('refund_wallet');
    expect(parsedMessage.items).toContain('risk_warnings');
  });
});
