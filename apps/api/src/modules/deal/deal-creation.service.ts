/**
 * Deal creation & duplication service (task 4.1).
 *
 * Server-authoritative: the $400-$50,000 amount bound is re-asserted here even
 * though the schema already checked it, so the rule holds no matter how the
 * service is called (Requirements 18.10, 18.11 / Property 11). Creation inserts
 * the deal plus an optional initial terms snapshot in ONE transaction.
 * Duplication clones only deal settings of a past deal the caller owns and
 * deliberately drops the other party's identity and all computed money figures,
 * resetting the new deal to a fresh 'Created' deal that still needs an invite
 * and counterparty (Requirement 8.7).
 */
import { AppError } from '../../errors/app-error.js';
import { checkDealCreationVelocity } from '../../lib/abuse-detector.js';
import {
  assertPracticeNetwork,
  mainnetOperationAllowed,
  PracticeModeError,
} from '../launch/practice.js';

import { DealAmountOutOfBoundsError, assertDealAmountWithinBounds } from './deal-amount.js';
import {
  insertDeal,
  insertDealTermsSnapshot,
  loadDealForDuplication,
  loadLatestTermsSnapshot,
} from './deal-creation.repository.js';
import {
  applyMiddlemanReviewHold,
  insertRiskFlag,
  logRiskFlag,
} from './deal-screening.repository.js';
import { screenItem } from './prohibited-items.js';
import { acquireClient } from './deal.repository.js';
import type { TxClient } from './deal.repository.js';
import type { CreateDealInput } from './deal.schemas.js';
import { getOperatorReceiveAddress } from '../money/operator-receive-wallets.js';
import {
  insertEscrowAddress,
  type EscrowAddressTxClient,
} from '../money/escrow-address.repository.js';
import { ensureChat, type ChatTxClient } from '../chat/chat.repository.js';
import { getConnectionById } from '../connections/connections.repository.js';

export type FeePayer = 'buyer' | 'seller' | 'split';
export type NetworkMode = 'mainnet' | 'testnet';

export interface CreateDealArgs {
  readonly sellerId: string;
  readonly input: CreateDealInput;
}

export interface DuplicateDealArgs {
  readonly sellerId: string;
  readonly sourceDealId: string;
}

export interface CreatedDealResult {
  readonly dealId: string;
  readonly status: string;
  readonly createdAt: string;
  readonly duplicatedFrom?: string;
  /** True when screening routed the deal to middleman review (Requirement 9.2). */
  readonly requiresMiddlemanReview: boolean;
}

function toAppErrorOnBadAmount(err: unknown): never {
  if (err instanceof DealAmountOutOfBoundsError) {
    throw new AppError(
      'deal_amount_out_of_bounds',
      'Deal amount must be between $400 and $50,000.',
      422,
    );
  }
  throw err;
}

/** Create a brand-new deal owned by the seller. */
export async function createDeal(args: CreateDealArgs): Promise<CreatedDealResult> {
  const { sellerId, input } = args;

  await checkDealCreationVelocity(sellerId);

  // Requirement 9.1: the seller must affirm the item is legal. The schema uses
  // z.literal(true); this is a defensive re-check for non-HTTP callers.
  if (input.confirmLegal !== true) {
    throw new AppError(
      'legal_confirmation_required',
      'You must confirm the item is legal and allowed.',
      422,
    );
  }

  try {
    assertDealAmountWithinBounds(input.dealAmountCents);
  } catch (err) {
    toAppErrorOnBadAmount(err);
  }

  const networkMode = input.networkMode ?? (input.isPractice ? 'testnet' : 'mainnet');
  try {
    assertPracticeNetwork(input.isPractice ?? false, networkMode);
  } catch (err) {
    if (err instanceof PracticeModeError) {
      throw new AppError('invalid_practice_network', 'Practice deals must use testnet.', 422);
    }
    throw err;
  }
  if (networkMode === 'mainnet' && !mainnetOperationAllowed()) {
    throw new AppError(
      'mainnet_not_enabled',
      'Mainnet deals are disabled until the operator completes the go-live checklist.',
      503,
    );
  }

  // When created from a connection, resolve buyer/seller from its two
  // participants. The caller's chosen role decides their side; the other
  // participant takes the opposite role.
  let dealSellerId = sellerId;
  let dealBuyerId: string | null = null;
  if (input.connectionId) {
    const conn = await getConnectionById(input.connectionId);
    if (!conn) {
      throw new AppError('connection_not_found', 'Connection was not found.', 404);
    }
    const isParticipant = conn.creator_id === sellerId || conn.joiner_id === sellerId;
    if (!isParticipant) {
      throw new AppError('forbidden', 'You are not a participant of this connection.', 403);
    }
    if (!conn.joiner_id) {
      throw new AppError(
        'connection_not_joined',
        'The other party has not joined this connection yet.',
        409,
      );
    }
    if (conn.deal_id) {
      throw new AppError('connection_has_deal', 'A deal already exists for this connection.', 409);
    }
    const other = conn.creator_id === sellerId ? conn.joiner_id : conn.creator_id;
    if (input.creatorRole === 'buyer') {
      dealBuyerId = sellerId;
      dealSellerId = other;
    } else {
      dealSellerId = sellerId;
      dealBuyerId = other;
    }
  }

  // Requirements 9.2, 9.3: screen the item text. Prohibited categories are
  // blocked outright; risky keywords route the new deal to middleman review.
  const screen = screenItem({
    text: [input.itemDescription ?? '', input.terms ?? ''].join(' '),
    ...(input.productType !== undefined ? { productType: input.productType } : {}),
  });
  if (screen.decision === 'block') {
    await logRiskFlag({
      dealId: null,
      userId: sellerId,
      flagType: screen.flags[0]?.flagType ?? 'prohibited',
      severity: 'block',
      details: screen.flags.map((f) => f.details).join(' | '),
    });
    throw new AppError(
      'prohibited_item',
      'This item is prohibited and cannot be traded on TrustVexa.',
      422,
    );
  }

  const client: TxClient = await acquireClient();
  try {
    await client.query('BEGIN');

    const policyCheck = await client.query<{
      doc_type: string;
      active_version: string;
      accepted_version: string;
    }>(
      `SELECT pv.doc_type, pv.version AS active_version, ta.version AS accepted_version
       FROM policy_versions pv
       LEFT JOIN terms_acceptances ta ON ta.user_id = $1 AND ta.doc_type = pv.doc_type AND ta.version = pv.version
       WHERE pv.doc_type IN ('terms', 'privacy')
         AND pv.published_at = (
           SELECT MAX(published_at) FROM policy_versions WHERE doc_type = pv.doc_type
         )`,
      [sellerId],
    );
    if (policyCheck.rows.some((r) => !r.accepted_version)) {
      throw new AppError(
        'policy_re_acceptance_required',
        'You must accept the latest Terms and Privacy Policy before creating a deal.',
        403,
      );
    }

    const deal = await insertDeal(client, {
      sellerId: dealSellerId,
      buyerId: dealBuyerId,
      coin: input.coin,
      network: input.network,
      networkMode,
      isPractice: input.isPractice ?? false,
      dealAmountCents: input.dealAmountCents,
      feePayer: input.feePayer,
      feeSplitBuyerBps: input.feePayer === 'split' ? (input.feeSplitBuyerBps ?? 5000) : null,
      priceTolerancePct: input.priceTolerancePct ?? null,
      templateId: input.templateId ?? null,
      productId: input.productId ?? null,
      preferredMiddlemanId: input.preferredMiddlemanId ?? null,
    });

    if (input.terms !== undefined && input.terms.trim() !== '') {
      await insertDealTermsSnapshot(client, deal.id, 1, input.terms);
    }

    // Provision the deal's chat rooms up front so the deal chat opens freely as
    // soon as the counterparty joins — no verification-code step required. The
    // buyer<->seller room (middleman observes), and the buyer<->mm / seller<->mm
    // side-channels. Membership is resolved from the deal's parties at read
    // time, so creating the rooms now is safe even before the buyer joins.
    const chatTx = client as unknown as ChatTxClient;
    await ensureChat(chatTx, deal.id, 'buyer_seller');
    await ensureChat(chatTx, deal.id, 'buyer_mm');
    await ensureChat(chatTx, deal.id, 'seller_mm');

    // Link the originating connection to this deal so both parties see it.
    if (input.connectionId) {
      await client.query(
        `UPDATE connections SET deal_id = $2, updated_at = now() WHERE id = $1`,
        [input.connectionId, deal.id],
      );
    }

    // Provision the per-deal escrow deposit address from the operator's
    // configured receive wallets (operator-receive-wallets.ts). Only mainnet
    // deals are assigned the real operator addresses; testnet/practice deals
    // settle on testnets and are not given a mainnet receive address here.
    if (networkMode === 'mainnet') {
      const receiveAddress = getOperatorReceiveAddress(input.coin, input.network);
      if (!receiveAddress) {
        throw new AppError(
          'escrow_address_unavailable',
          `No operator receive address is configured for ${input.coin} on ${input.network}. ` +
            `Configure it in operator-receive-wallets before creating mainnet deals for this asset.`,
          503,
        );
      }
      await insertEscrowAddress(client as unknown as EscrowAddressTxClient, {
        dealId: deal.id,
        coin: input.coin,
        network: input.network,
        address: receiveAddress,
        derivationIndex: null,
      });
    }

    if (input.tags && input.tags.length > 0) {
      for (const tag of input.tags) {
        await client.query(
          `INSERT INTO deal_tags (user_id, deal_id, label)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [sellerId, deal.id, tag],
        );
      }
    }

    if (screen.decision === 'review') {
      await applyMiddlemanReviewHold(client, deal.id, screen.riskScore);
      for (const flag of screen.flags) {
        await insertRiskFlag(client, {
          dealId: deal.id,
          userId: sellerId,
          flagType: flag.flagType,
          severity: flag.severity,
          details: flag.details,
        });
      }
    }

    await client.query('COMMIT');
    return {
      dealId: deal.id,
      status: deal.status,
      createdAt: deal.created_at,
      requiresMiddlemanReview: screen.decision === 'review',
    };
  } catch (err) {
    await rollbackQuietly(client);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Duplicate a past deal the caller owns, cloning settings only. The new deal
 * has no buyer/middleman and resets status, attempt, and version to their
 * defaults; the latest terms snapshot is copied as version 1.
 */
export async function duplicateDeal(args: DuplicateDealArgs): Promise<CreatedDealResult> {
  const { sellerId, sourceDealId } = args;
  const client: TxClient = await acquireClient();
  try {
    await client.query('BEGIN');

    const src = await loadDealForDuplication(client, sourceDealId, sellerId);
    if (src === null) {
      throw new AppError(
        'deal_not_found',
        'Source deal was not found or is not owned by you.',
        404,
      );
    }

    // Defensive: a previously valid deal should still be in range, but never
    // clone an out-of-bounds amount into a new deal.
    if (src.deal_amount !== null) {
      try {
        assertDealAmountWithinBounds(src.deal_amount);
      } catch (err) {
        toAppErrorOnBadAmount(err);
      }
    }

    const deal = await insertDeal(client, {
      sellerId,
      coin: src.coin,
      network: src.network,
      networkMode: src.network_mode,
      isPractice: src.is_practice,
      dealAmountCents: src.deal_amount ?? 0,
      feePayer: src.fee_payer ?? 'split',
      feeSplitBuyerBps:
        (src.fee_payer ?? 'split') === 'split' ? (src.fee_split_buyer_bps ?? 5000) : null,
      priceTolerancePct: src.price_tolerance_pct,
      templateId: src.template_id,
      productId: src.product_id,
    });

    let requiresMiddlemanReview = false;
    const terms = await loadLatestTermsSnapshot(client, sourceDealId);
    if (terms !== null && terms.trim() !== '') {
      // Re-screen cloned terms so a duplicate can never bypass the checks.
      const dupScreen = screenItem({ text: terms });
      if (dupScreen.decision === 'block') {
        throw new AppError(
          'prohibited_item',
          'This item is prohibited and cannot be traded on TrustVexa.',
          422,
        );
      }
      await insertDealTermsSnapshot(client, deal.id, 1, terms);
      if (dupScreen.decision === 'review') {
        requiresMiddlemanReview = true;
        await applyMiddlemanReviewHold(client, deal.id, dupScreen.riskScore);
        for (const flag of dupScreen.flags) {
          await insertRiskFlag(client, {
            dealId: deal.id,
            userId: sellerId,
            flagType: flag.flagType,
            severity: flag.severity,
            details: flag.details,
          });
        }
      }
    }

    await client.query('COMMIT');
    return {
      dealId: deal.id,
      status: deal.status,
      createdAt: deal.created_at,
      duplicatedFrom: sourceDealId,
      requiresMiddlemanReview,
    };
  } catch (err) {
    await rollbackQuietly(client);
    throw err;
  } finally {
    client.release();
  }
}

async function rollbackQuietly(client: TxClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* transaction already aborted or connection lost */
  }
}
