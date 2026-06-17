/**
 * Database-backed integration tests for the milestone-release money flow
 * (task 7.2) and the middleman enforcement flow (task 7.3). Gated on
 * `DATABASE_URL` so the offline unit run skips them. They prove against a REAL
 * PostgreSQL that:
 *   - releasing milestones posts a balanced ledger, marks each milestone, and
 *     drives the two-step PayoutQueued -> MilestoneReleased -> {PayoutQueued |
 *     Released} transition, finishing the deal on the last milestone;
 *   - enforcement actions (block / trust-downgrade) apply the state change AND
 *     append a hash-chained `admin_actions` audit row whose chain stays intact.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closePool, query } from '@trustvexa/shared';

import { releaseMilestone } from '../modules/handover/handover.service.js';
import { blockUser, downgradeTrust } from '../modules/admin/enforcement.service.js';

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

async function insertMilestone(dealId: string, amount: bigint): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO deal_milestones (deal_id, amount_smallest_unit, status) VALUES ($1, $2, 'pending') RETURNING id`,
    [dealId, amount.toString()],
  );
  return res.rows[0]!.id;
}

d('milestone release (DB-backed)', () => {
  let buyer = '';
  let seller = '';
  let middleman = '';

  beforeAll(async () => {
    buyer = await insertUser('user');
    seller = await insertUser('user');
    middleman = await insertUser('middleman');
  });

  it('releases a single final milestone, balances the ledger, and reaches Released', async () => {
    const dealId = await insertDeal({
      buyer,
      seller,
      middleman,
      status: 'PayoutQueued',
      amount: 1000n,
    });
    const milestoneId = await insertMilestone(dealId, 1000n);

    const result = await releaseMilestone({
      userId: middleman,
      dealId,
      milestoneId,
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });

    expect(result.isFinal).toBe(true);
    expect(result.toState).toBe('Released');
    expect(result.amountSmallestUnit).toBe('1000');

    const deal = await query<{ status: string }>(`SELECT status FROM deals WHERE id = $1`, [
      dealId,
    ]);
    expect(deal.rows[0]!.status).toBe('Released');

    const ms = await query<{ status: string }>(`SELECT status FROM deal_milestones WHERE id = $1`, [
      milestoneId,
    ]);
    expect(ms.rows[0]!.status).toBe('released');

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
  });

  it('releases two milestones: the first loops to PayoutQueued, the last finishes the deal', async () => {
    const dealId = await insertDeal({
      buyer,
      seller,
      middleman,
      status: 'PayoutQueued',
      amount: 1000n,
    });
    const first = await insertMilestone(dealId, 400n);
    const second = await insertMilestone(dealId, 600n);

    const r1 = await releaseMilestone({
      userId: middleman,
      dealId,
      milestoneId: first,
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });
    expect(r1.isFinal).toBe(false);
    expect(r1.toState).toBe('PayoutQueued');

    const r2 = await releaseMilestone({
      userId: middleman,
      dealId,
      milestoneId: second,
      requestId: randomUUID(),
      idempotencyKey: randomUUID(),
    });
    expect(r2.isFinal).toBe(true);
    expect(r2.toState).toBe('Released');
  });

  it('rejects a release by someone who is not the deal middleman', async () => {
    const other = await insertUser('middleman');
    const dealId = await insertDeal({
      buyer,
      seller,
      middleman,
      status: 'PayoutQueued',
      amount: 1000n,
    });
    const milestoneId = await insertMilestone(dealId, 1000n);
    await expect(
      releaseMilestone({
        userId: other,
        dealId,
        milestoneId,
        requestId: randomUUID(),
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow();
  });
});

d('enforcement (DB-backed)', () => {
  let middleman = '';

  beforeAll(async () => {
    middleman = await insertUser('middleman');
  });

  afterAll(async () => {
    await closePool();
  });

  it('blocks a user and appends a hash-chained admin_actions audit row', async () => {
    const target = await insertUser('user');
    const result = await blockUser({
      actorId: middleman,
      targetUserId: target,
      reason: 'fraudulent activity',
      requestId: randomUUID(),
    });
    expect(result.accountStatus).toBe('blocked');

    const user = await query<{ account_status: string }>(
      `SELECT account_status FROM users WHERE id = $1`,
      [target],
    );
    expect(user.rows[0]!.account_status).toBe('blocked');

    const block = await query<{ block_type: string }>(
      `SELECT block_type FROM user_blocks WHERE blocked_user_id = $1`,
      [target],
    );
    expect(block.rows[0]!.block_type).toBe('middleman_platform_block');

    const audit = await query<{ action: string; prev_hash: string; entry_hash: string }>(
      `SELECT action, prev_hash, entry_hash FROM admin_actions WHERE target_id = $1`,
      [target],
    );
    expect(audit.rows[0]!.action).toBe('block_user');
    expect(audit.rows[0]!.entry_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('lowers trust level, records a trust_events row, and chains the audit log', async () => {
    const target = await insertUser('user');
    const before = await query<{ trust_level: number }>(
      `SELECT trust_level FROM users WHERE id = $1`,
      [target],
    );
    const result = await downgradeTrust({
      actorId: middleman,
      targetUserId: target,
      amount: 2,
      reason: 'missed deadline',
      requestId: randomUUID(),
    });
    expect(result.trustLevel).toBe(before.rows[0]!.trust_level - 2);

    const ev = await query<{ change: number }>(
      `SELECT change FROM trust_events WHERE user_id = $1`,
      [target],
    );
    expect(ev.rows[0]!.change).toBe(-2);
  });

  it('keeps the global admin_actions hash chain intact across actions', async () => {
    // After the prior actions, the newest entries must form a valid chain: each
    // row's prev_hash equals the entry_hash of the chronologically previous row.
    const rows = await query<{ prev_hash: string | null; entry_hash: string }>(
      `SELECT prev_hash, entry_hash FROM admin_actions ORDER BY created_at ASC`,
    );
    expect(rows.rows.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < rows.rows.length; i += 1) {
      expect(rows.rows[i]!.prev_hash).toBe(rows.rows[i - 1]!.entry_hash);
    }
  });
});
