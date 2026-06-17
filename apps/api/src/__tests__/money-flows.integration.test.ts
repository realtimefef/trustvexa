/**
 * Database-backed integration tests for the money-write contract and the
 * dispute-resolution flow (tasks 5.11, 7.5). These run only when `DATABASE_URL`
 * points at a migrated PostgreSQL (the CI integration job and local Docker);
 * the offline unit run skips the whole suite, so the fast job stays green.
 *
 * They prove against a REAL database that:
 *   - `runMoneyWrite` performs work exactly once per Idempotency-Key and
 *     replays the stored result on a repeat (no double settlement);
 *   - the optimistic lock rejects a stale-version write with `concurrent_update`;
 *   - a middleman dispute resolution settles the escrow with a balanced
 *     double-entry ledger, records the settlement, and transitions the deal.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closePool, getClient, query } from '@trustvexa/shared';

import {
  runMoneyWrite,
  lockDealVersion,
  type MoneyTxClient,
} from '../modules/money/money-write.js';
import { resolveDisputeForMiddleman } from '../modules/disputes/dispute.service.js';

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

d('money-write contract (DB-backed)', () => {
  let buyer = '';
  let seller = '';
  let middleman = '';

  beforeAll(async () => {
    buyer = await insertUser('user');
    seller = await insertUser('user');
    middleman = await insertUser('middleman');
  });

  it('runs work exactly once per Idempotency-Key and replays the result', async () => {
    const dealId = await insertDeal({ buyer, seller, middleman, status: 'Created', amount: 1000n });
    const key = randomUUID();
    let runs = 0;

    const first = await runMoneyWrite<{ ok: boolean }>({
      idempotencyKey: key,
      actionType: 'test_action',
      userId: middleman,
      dealId,
      payload: { dealId },
      work: async () => {
        runs += 1;
        return { ok: true };
      },
    });
    const second = await runMoneyWrite<{ ok: boolean }>({
      idempotencyKey: key,
      actionType: 'test_action',
      userId: middleman,
      dealId,
      payload: { dealId },
      work: async () => {
        runs += 1;
        return { ok: true };
      },
    });

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual({ ok: true });
    expect(runs).toBe(1); // work executed only once despite two calls
  });

  it('rejects a stale-version write with concurrent_update', async () => {
    const dealId = await insertDeal({ buyer, seller, middleman, status: 'Created', amount: 1000n });
    const client = (await getClient()) as unknown as MoneyTxClient;
    try {
      await client.query('BEGIN');
      // Deal starts at version_no = 0; asking to lock at version 5 must fail.
      let code: string | undefined;
      try {
        await lockDealVersion(client, dealId, 5);
      } catch (err) {
        code = (err as { errorCode?: string }).errorCode;
      }
      expect(code).toBe('concurrent_update');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

d('dispute resolution (DB-backed)', () => {
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

  async function seedDisputedDeal(amount: bigint): Promise<string> {
    const dealId = await insertDeal({ buyer, seller, middleman, status: 'Disputed', amount });
    await query(
      `INSERT INTO disputes (deal_id, raised_by, reason, status) VALUES ($1, $2, 'item not delivered', 'open')`,
      [dealId, buyer],
    );
    return dealId;
  }

  it('full_refund settles the escrow to the buyer, balances the ledger, and refunds the deal', async () => {
    const dealId = await seedDisputedDeal(1000n);
    const result = await resolveDisputeForMiddleman({
      userId: middleman,
      dealId,
      outcome: 'full_refund',
      reason: 'Item never delivered; refunding the buyer.',
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });

    expect(result.outcome).toBe('full_refund');
    expect(result.toBuyerSmallestUnit).toBe('1000');
    expect(result.toSellerSmallestUnit).toBe('0');
    expect(result.toState).toBe('Refunded');

    // Deal really transitioned.
    const deal = await query<{ status: string }>(`SELECT status FROM deals WHERE id = $1`, [
      dealId,
    ]);
    expect(deal.rows[0]!.status).toBe('Refunded');

    // A settlement row was recorded.
    const settle = await query<{ buyer_refund_amount: string }>(
      `SELECT buyer_refund_amount FROM settlements WHERE deal_id = $1`,
      [dealId],
    );
    expect(settle.rows[0]!.buyer_refund_amount).toBe('1000');

    // The ledger posted for this deal balances (debits === credits).
    const led = await query<{ direction: string; amount_smallest_unit: string }>(
      `SELECT direction, amount_smallest_unit FROM ledger_entries WHERE deal_id = $1`,
      [dealId],
    );
    const debit = led.rows
      .filter((r) => r.direction === 'debit')
      .reduce((s, r) => s + BigInt(r.amount_smallest_unit), 0n);
    const credit = led.rows
      .filter((r) => r.direction === 'credit')
      .reduce((s, r) => s + BigInt(r.amount_smallest_unit), 0n);
    expect(led.rows.length).toBeGreaterThan(0);
    expect(debit).toBe(credit);

    // The dispute is resolved and a decision document was recorded.
    const disp = await query<{ status: string; resolution: string | null }>(
      `SELECT status, resolution FROM disputes WHERE deal_id = $1`,
      [dealId],
    );
    expect(disp.rows[0]!.status).toBe('resolved');
    expect(disp.rows[0]!.resolution).toBe('full_refund');
    const doc = await query<{ document_type: string }>(
      `SELECT document_type FROM deal_documents WHERE deal_id = $1`,
      [dealId],
    );
    expect(doc.rows[0]!.document_type).toBe('dispute_decision');
  });

  it('partial_split divides the escrow exactly and reaches PartiallySettled', async () => {
    const dealId = await seedDisputedDeal(1000n);
    const result = await resolveDisputeForMiddleman({
      userId: middleman,
      dealId,
      outcome: 'partial_split',
      reason: 'Both parties partly at fault.',
      buyerShareSmallestUnit: 400n,
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });
    expect(result.toBuyerSmallestUnit).toBe('400');
    expect(result.toSellerSmallestUnit).toBe('600');
    expect(result.toState).toBe('PartiallySettled');
  });

  it('refuses a second resolution of an already-resolved dispute', async () => {
    const dealId = await seedDisputedDeal(1000n);
    await resolveDisputeForMiddleman({
      userId: middleman,
      dealId,
      outcome: 'full_release',
      reason: 'Seller delivered as agreed.',
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });
    await expect(
      resolveDisputeForMiddleman({
        userId: middleman,
        dealId,
        outcome: 'full_refund',
        reason: 'changed my mind',
        requestId: randomUUID(),
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow();
  });
});
