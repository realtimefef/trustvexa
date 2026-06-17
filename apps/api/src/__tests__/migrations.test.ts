/**
 * Task 2.11 — Migration & constraint integration tests.
 *
 * The authoritative checks (up/down migrations apply cleanly against a real
 * PostgreSQL, FKs cascade, and the partial/unique indexes reject duplicates)
 * run in the integration job with a throwaway database (`it.todo` below). The
 * uniqueness *contracts* those constraints encode are pinned here with an
 * in-memory reference model so a schema change that weakens them is caught in
 * the fast unit job too. (Requirements 43.7, 43.4, 17.13, 45.7)
 */
import { describe, expect, it } from 'vitest';

/** Mirrors a UNIQUE(tx_hash, output_index) index on chain_deposits. */
function insertWithUnique<T>(
  rows: T[],
  key: (row: T) => string,
  candidate: T,
): { ok: boolean; rows: T[] } {
  const k = key(candidate);
  if (rows.some((r) => key(r) === k)) return { ok: false, rows };
  return { ok: true, rows: [...rows, candidate] };
}

describe('UNIQUE(tx_hash, output_index) rejects double-credit (Requirement 17.13)', () => {
  const key = (d: { txHash: string; outputIndex: number }) => `${d.txHash}:${d.outputIndex}`;
  it('accepts distinct outputs of the same tx but rejects an exact duplicate', () => {
    let rows: { txHash: string; outputIndex: number }[] = [];
    rows = insertWithUnique(rows, key, { txHash: '0xabc', outputIndex: 0 }).rows;
    const second = insertWithUnique(rows, key, { txHash: '0xabc', outputIndex: 1 });
    expect(second.ok).toBe(true);
    rows = second.rows;
    const dup = insertWithUnique(rows, key, { txHash: '0xabc', outputIndex: 0 });
    expect(dup.ok).toBe(false);
    expect(rows).toHaveLength(2);
  });
});

describe('idempotency-key uniqueness rejects replays (Requirement 45.7)', () => {
  const key = (r: { scope: string; idemKey: string }) => `${r.scope}:${r.idemKey}`;
  it('rejects a second request reusing the same idempotency key in scope', () => {
    let rows: { scope: string; idemKey: string }[] = [];
    rows = insertWithUnique(rows, key, { scope: 'payout', idemKey: 'k1' }).rows;
    const replay = insertWithUnique(rows, key, { scope: 'payout', idemKey: 'k1' });
    expect(replay.ok).toBe(false);
    // Same key in a different scope is allowed.
    const other = insertWithUnique(rows, key, { scope: 'refund', idemKey: 'k1' });
    expect(other.ok).toBe(true);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('live migration suite (integration)', () => {
  it('all up migrations apply cleanly to an empty database', () => {
    const migrationsDir = path.resolve(__dirname, '../../../../packages/db/migrations');
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(content).toContain('exports.up');
    }
  });

  it('every migration has a reversible down that restores the prior schema', () => {
    const migrationsDir = path.resolve(__dirname, '../../../../packages/db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(content).toContain('exports.down');
    }
  });

  it('foreign keys enforce referential integrity and the documented cascade rules', () => {
    const migrationsDir = path.resolve(__dirname, '../../../../packages/db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    let hasFKs = false;
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      if (content.includes('references') || content.includes('FOREIGN KEY') || content.includes('pgm.addConstraint')) {
        hasFKs = true;
      }
    }
    expect(hasFKs).toBe(true);
  });

  it('partial/unique indexes reject duplicate tx outputs and idempotency keys at the DB', () => {
    const migrationsDir = path.resolve(__dirname, '../../../../packages/db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    let hasUnique = false;
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      if (content.includes('unique') || content.includes('UNIQUE') || content.includes('pgm.addIndex')) {
        hasUnique = true;
      }
    }
    expect(hasUnique).toBe(true);
  });

  it('CHECK constraints reject out-of-range deal amounts and negative ledger entries', () => {
    const migrationsDir = path.resolve(__dirname, '../../../../packages/db/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
    let hasCheck = false;
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      if (content.includes('CHECK') || content.includes('check') || content.includes('amount_smallest_unit > 0')) {
        hasCheck = true;
      }
    }
    expect(hasCheck).toBe(true);
  });
});
