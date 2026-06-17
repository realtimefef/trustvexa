/**
 * Referral program service (Build Spec §3 "Support / misc").
 *
 * Ownership is always derived from the JWT user id passed by the controller.
 * Creating the caller's code is idempotent get-or-create of their holder row
 * (the referral row with no invited email), run inside a single transaction so
 * concurrent first-time requests cannot create two codes.
 *
 * NOTE on `status`: the migration stores `status` as free text and the data
 * dictionary documents `sent` / `joined` / `expired` for invited referrals. The
 * caller's self-issued code holder row uses `sent` as its initial status.
 */
import { randomUUID } from 'node:crypto';

import { withTransaction } from '@trustvexa/shared';

import {
  findOwnCode,
  insertOwnCode,
  listReferralsForUser,
  type ReferralRow,
  type TxClient,
} from './referrals.repository.js';

export interface ReferralView {
  id: string;
  code: string;
  invitedEmailHash: string | null;
  status: string | null;
  createdAt: string;
}

export interface ReferralCodeView {
  id: string;
  code: string;
  status: string | null;
  createdAt: string;
}

export interface ReferralListView {
  /** The caller's shareable referral code, or null if not yet created. */
  code: string | null;
  referrals: ReferralView[];
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Short, shareable, reasonably-unique referral code. */
function generateReferralCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function toView(row: ReferralRow): ReferralView {
  return {
    id: row.id,
    code: row.code,
    invitedEmailHash: row.invited_email_hash,
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

/** Get-or-create the caller's referral code holder row. Idempotent. */
export async function getOrCreateCode(userId: string): Promise<ReferralCodeView> {
  const row = await withTransaction(async (client) => {
    const tx = client as unknown as TxClient;
    const existing = await findOwnCode(tx, userId);
    if (existing) {
      return existing;
    }
    return insertOwnCode(tx, { userId, code: generateReferralCode(), status: 'sent' });
  });
  return { id: row.id, code: row.code, status: row.status, createdAt: toIso(row.created_at) };
}

/** List the caller's referrals plus their own shareable code. */
export async function listReferrals(userId: string): Promise<ReferralListView> {
  const rows = await listReferralsForUser(userId);
  const holder = rows.find((r) => r.invited_email_hash === null) ?? null;
  return {
    code: holder?.code ?? null,
    referrals: rows.map(toView),
  };
}
