// Feature: trustvexa-escrow-platform, Property 8: Money writes are idempotent and replay the original result
// Feature: trustvexa-escrow-platform, Property 7: Concurrent money writes serialize via the optimistic lock
// Feature: trustvexa-escrow-platform, Property 21: Money and status changes commit atomically or not at all
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  canonicalize,
  lockDealVersion,
  requestHash,
  runMoneyWrite,
  type MoneyTxClient,
} from '../money-write.js';

// In-memory fake pg client modeling the unique-key claim, the deal version
// guard, and BEGIN/COMMIT/ROLLBACK staging that runMoneyWrite relies on.
interface IdemRow {
  request_hash: string;
  status: string;
  response_ref: string | null;
}
interface Store {
  idem: Map<string, IdemRow>;
  deals: Map<string, { version_no: number }>;
  ledger: Array<Record<string, unknown>>;
}
interface Staged {
  idem: Map<string, IdemRow>;
  idemUpdates: Map<string, Partial<IdemRow>>;
  deals: Map<string, number>;
  ledger: Array<Record<string, unknown>>;
}
function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function makeFakeDb(initialDeals: Record<string, number> = {}): {
  store: Store;
  clientFactory: () => Promise<MoneyTxClient>;
} {
  const store: Store = { idem: new Map(), deals: new Map(), ledger: [] };
  for (const [id, v] of Object.entries(initialDeals)) store.deals.set(id, { version_no: v });

  function newClient(): MoneyTxClient {
    let staged: Staged | null = null;
    const run = async <R>(
      text: string,
      params: readonly unknown[] = [],
    ): Promise<{ rows: R[]; rowCount: number | null }> => {
      const q = norm(text);
      if (q === 'BEGIN') {
        staged = { idem: new Map(), idemUpdates: new Map(), deals: new Map(), ledger: [] };
        return { rows: [], rowCount: 0 };
      }
      if (q === 'COMMIT') {
        if (staged) {
          for (const [k, v] of staged.idem) store.idem.set(k, v);
          for (const [k, upd] of staged.idemUpdates) {
            const cur = store.idem.get(k);
            if (cur) store.idem.set(k, { ...cur, ...upd });
          }
          for (const [id, v] of staged.deals) store.deals.set(id, { version_no: v });
          for (const e of staged.ledger) store.ledger.push(e);
        }
        staged = null;
        return { rows: [], rowCount: 0 };
      }
      if (q === 'ROLLBACK') {
        staged = null;
        return { rows: [], rowCount: 0 };
      }
      if (!staged) throw new Error('query outside transaction');
      if (q.startsWith('INSERT INTO idempotency_keys')) {
        const key = params[0] as string;
        if (store.idem.has(key)) return { rows: [], rowCount: 0 };
        staged.idem.set(key, {
          request_hash: params[4] as string,
          status: 'in_progress',
          response_ref: null,
        });
        return { rows: [{ id: `idem-${key}` } as unknown as R], rowCount: 1 };
      }
      if (q.startsWith('SELECT request_hash, status, response_ref FROM idempotency_keys')) {
        const row = store.idem.get(params[0] as string);
        return { rows: row ? [row as unknown as R] : [], rowCount: row ? 1 : 0 };
      }
      if (q.startsWith("UPDATE idempotency_keys SET status = 'succeeded'")) {
        staged.idemUpdates.set(params[0] as string, {
          status: 'succeeded',
          response_ref: params[1] as string,
        });
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith('UPDATE deals SET version_no = version_no + 1')) {
        const id = params[0] as string;
        const expected = params[1] as number;
        const current = staged.deals.get(id) ?? store.deals.get(id)?.version_no;
        if (current === expected) {
          staged.deals.set(id, expected + 1);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      if (
        q.startsWith('INSERT INTO ledger_entries') ||
        q.startsWith('INSERT INTO ledger_accounts')
      ) {
        staged.ledger.push({ q, params });
        return { rows: [{ id: 'acct-1' } as unknown as R], rowCount: 1 };
      }
      throw new Error(`unexpected query: ${q}`);
    };
    return { query: run as MoneyTxClient['query'], release: () => {} };
  }
  return { store, clientFactory: async () => newClient() };
}

describe('Property 8: idempotent money writes (Requirements 17.13, 17.14)', () => {
  it('performs the work once and replays the stored result for a repeated key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.object(),
        async (key, userId, payload) => {
          const db = makeFakeDb();
          let calls = 0;
          const make = () =>
            runMoneyWrite({
              idempotencyKey: key,
              actionType: 'fund_deal',
              userId,
              payload,
              clientFactory: db.clientFactory,
              work: async () => {
                calls += 1;
                return { status: 'funded', n: calls };
              },
            });
          const first = await make();
          const second = await make();
          expect(calls).toBe(1);
          expect(first.replayed).toBe(false);
          expect(second.replayed).toBe(true);
          expect(second.result).toEqual(first.result);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects a key reused with a different payload', async () => {
    const db = makeFakeDb();
    await runMoneyWrite({
      idempotencyKey: 'K2',
      actionType: 'a',
      userId: null,
      payload: { a: 1 },
      clientFactory: db.clientFactory,
      work: async () => ({ ok: true }),
    });
    await expect(
      runMoneyWrite({
        idempotencyKey: 'K2',
        actionType: 'a',
        userId: null,
        payload: { a: 2 },
        clientFactory: db.clientFactory,
        work: async () => ({ ok: true }),
      }),
    ).rejects.toMatchObject({ errorCode: 'idempotency_key_reused' });
  });

  it('requires an idempotency key', async () => {
    const db = makeFakeDb();
    await expect(
      runMoneyWrite({
        idempotencyKey: '',
        actionType: 'a',
        userId: null,
        payload: {},
        clientFactory: db.clientFactory,
        work: async () => ({}),
      }),
    ).rejects.toMatchObject({ errorCode: 'idempotency_key_required' });
  });

  it('hashes payloads independent of key order and detects changes', () => {
    expect(requestHash({ a: 1, b: 2 })).toBe(requestHash({ b: 2, a: 1 }));
    expect(requestHash({ a: 1 })).not.toBe(requestHash({ a: 2 }));
    expect(canonicalize({ n: 10n })).toContain('10n');
  });
});

describe('Property 7: optimistic-lock serialization (Requirement 17.11)', () => {
  it('lets the current version win and rejects the stale writer with concurrent_update', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 100 }), async (v) => {
        const db = makeFakeDb({ 'deal-1': v });
        const winner = await runMoneyWrite({
          idempotencyKey: 'W1',
          actionType: 'release',
          userId: 'u',
          dealId: 'deal-1',
          payload: {},
          clientFactory: db.clientFactory,
          work: async (c) => ({ version: await lockDealVersion(c, 'deal-1', v) }),
        });
        expect(winner.result.version).toBe(v + 1);
        await expect(
          runMoneyWrite({
            idempotencyKey: 'W2',
            actionType: 'release',
            userId: 'u',
            dealId: 'deal-1',
            payload: {},
            clientFactory: db.clientFactory,
            work: async (c) => {
              await lockDealVersion(c, 'deal-1', v);
              return {};
            },
          }),
        ).rejects.toMatchObject({ errorCode: 'concurrent_update' });
        expect(db.store.deals.get('deal-1')?.version_no).toBe(v + 1);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 21: atomic money/status writes (Requirement 17.12)', () => {
  it('rolls back the key claim and ledger writes on failure, allowing a clean retry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.integer({ min: 1, max: 10 }),
        async (shouldFail, numQueries) => {
          const db = makeFakeDb({ 'deal-2': 0 });
          const key = 'A1';

          const run = () =>
            runMoneyWrite({
              idempotencyKey: key,
              actionType: 'fund',
              userId: 'u',
              dealId: 'deal-2',
              payload: { x: 1 },
              clientFactory: db.clientFactory,
              work: async (c) => {
                for (let i = 0; i < numQueries; i++) {
                  await c.query('INSERT INTO ledger_entries (a) VALUES ($1)', [i]);
                }
                if (shouldFail) {
                  throw new Error('boom');
                }
                return { ok: true };
              },
            });

          if (shouldFail) {
            await expect(run()).rejects.toThrow('boom');
            expect(db.store.ledger).toHaveLength(0);
            expect(db.store.idem.has(key)).toBe(false);
            expect(db.store.deals.get('deal-2')?.version_no).toBe(0);
          } else {
            const res = await run();
            expect(res.replayed).toBe(false);
            expect(db.store.ledger).toHaveLength(numQueries);
            expect(db.store.idem.get(key)?.status).toBe('succeeded');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
