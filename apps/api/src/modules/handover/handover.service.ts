/**
 * Handover read service (task 7.2). Returns the status of a deal's handover
 * items to a party of that deal, never the encrypted payloads. A buyer sees
 * whether each item has been revealed to them (via the pure `canBuyerReveal`
 * rule); the middleman and seller see the verification/reveal lifecycle.
 * (Requirements 40.1-40.6)
 */
import { getClient } from '@trustvexa/shared';

import { AppError, notFound } from '../../errors/app-error.js';
import { canBuyerReveal, type RevealStatus } from './milestones.js';
import { logAccess, revealToBuyer, type TxClient } from './handover.repository.js';
import {
  getDealAccess,
  getHandoverItemById,
  listHandoverItems,
  type HandoverDealAccessRow,
  type HandoverItemDetailRow,
} from './handover-read.repository.js';

type Role = 'buyer' | 'seller' | 'middleman';

function roleForUser(deal: HandoverDealAccessRow, userId: string): Role | null {
  if (deal.buyer_id === userId) return 'buyer';
  if (deal.seller_id === userId) return 'seller';
  if (deal.middleman_id === userId) return 'middleman';
  return null;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface HandoverItemView {
  id: string;
  itemType: string;
  verificationStatus: string;
  revealStatus: string;
  revealedToBuyer: boolean;
  transferredAt: string | null;
  createdAt: string | null;
}

export interface HandoverView {
  dealId: string;
  role: Role;
  items: HandoverItemView[];
}

export async function getHandoverForUser(userId: string, dealId: string): Promise<HandoverView> {
  const access = await getDealAccess(dealId);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Deal was not found.');
  }
  const rows = await listHandoverItems(dealId);
  return {
    dealId,
    role,
    items: rows.map((r) => ({
      id: r.id,
      itemType: r.item_type,
      verificationStatus: r.verification_status,
      revealStatus: r.reveal_status,
      revealedToBuyer: canBuyerReveal(r.reveal_status as RevealStatus),
      transferredAt: toIso(r.transferred_to_buyer_at),
      createdAt: toIso(r.created_at),
    })),
  };
}

type PooledTx = TxClient & { release: () => void };

function detailToView(row: HandoverItemDetailRow): HandoverItemView {
  return {
    id: row.id,
    itemType: row.item_type,
    verificationStatus: row.verification_status,
    revealStatus: row.reveal_status,
    revealedToBuyer: canBuyerReveal(row.reveal_status as RevealStatus),
    transferredAt: toIso(row.transferred_to_buyer_at),
    createdAt: toIso(row.created_at),
  };
}

/**
 * Reveal a handover item's credentials to the buyer. This is a middleman-only,
 * audited state change (`middleman_only` -> `revealed_to_buyer`) and never
 * returns the secret payload itself. The action is naturally idempotent: a
 * second call on an already-revealed item returns the current state.
 */
export async function revealHandoverItem(
  userId: string,
  itemId: string,
): Promise<HandoverItemView> {
  const item = await getHandoverItemById(itemId);
  if (!item) {
    throw notFound('Handover item was not found.');
  }
  const access = await getDealAccess(item.deal_id);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Handover item was not found.');
  }
  if (role !== 'middleman') {
    throw new AppError(
      'reveal_forbidden',
      'Only the deal middleman can reveal handover items to the buyer.',
      403,
    );
  }
  if (item.reveal_status === 'revoked') {
    throw new AppError(
      'reveal_revoked',
      'This handover item has been revoked and can no longer be revealed.',
      409,
    );
  }
  if (item.reveal_status === 'revealed_to_buyer') {
    return detailToView(item);
  }

  const client = (await getClient()) as unknown as PooledTx;
  try {
    await client.query('BEGIN');
    const updated = await revealToBuyer(client, itemId, userId);
    if (updated === 0) {
      throw new AppError(
        'reveal_conflict',
        'The handover item could not be revealed because its state changed.',
        409,
      );
    }
    await logAccess(client, { handoverItemId: itemId, viewerId: userId, accessType: 'reveal' });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  const refreshed = await getHandoverItemById(itemId);
  return detailToView(refreshed ?? item);
}
