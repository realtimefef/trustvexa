/**
 * Deal service — server-authoritative escrow transition (task 4.9, DB-bound).
 *
 * Ties the pure decision layer to PostgreSQL. A single transition runs inside
 * ONE database transaction:
 *   1. read the deal's current status + `version_no`;
 *   2. validate the (state, event) edge via `planTransition` (allow-list only);
 *   3. compute the next hash-chained `escrow_logs` entry;
 *   4. `UPDATE deals ... WHERE version_no = :readVersion` — 0 rows ⇒ a
 *      concurrent writer won, so abort and change nothing (Property 7);
 *   5. insert exactly one audit row (Property 9), then COMMIT.
 * Any failure rolls the whole transaction back, so the deal, version, and audit
 * log stay consistent (Property 21). (Requirements 13.2, 13.3, 17.11–17.12, 38.6)
 *
 * Idempotent replay (same Idempotency-Key ⇒ action performed once) is enforced
 * by the idempotency middleware / `idempotency_keys` table above this service.
 */
import { AppError } from '../../errors/app-error.js';
import { getRedis } from '@trustvexa/shared';
import { logger } from '../../logger.js';

import { appendEntry } from './audit-chain.js';
import type { EscrowLogVisibility, TxClient } from './deal.repository.js';
import {
  acquireClient,
  applyDealStatus,
  insertEscrowLog,
  loadDealVersion,
  loadLastEntryHash,
} from './deal.repository.js';
import type { DealEvent, DealStatus } from './state-machine.js';
import { DEAL_EVENTS } from './state-machine.js';
import { InvalidTransitionError, planTransition } from './transition.js';
// MONEY-CRIT-1 FIX: Import SLA timer starters so windows are set the moment
// a deal enters the state that opens each clock.
import {
  startFundingWindow,
  startCompletionClock,
  startInspectionWindow,
} from './lifecycle-timer.service.js';

export interface ApplyTransitionInput {
  readonly dealId: string;
  readonly event: DealEvent;
  /** Acting user URL, or null for system-initiated transitions (lifecycle timers). */
  readonly actorId: string | null;
  readonly requestId: string;
  readonly visibility?: EscrowLogVisibility;
}

export interface TransitionResult {
  readonly dealId: string;
  readonly from: string;
  readonly to: string;
  readonly event: DealEvent;
  readonly version: number;
  readonly entryHash: string;
}

const DEAL_EVENT_SET: ReadonlySet<string> = new Set(DEAL_EVENTS);

/**
 * Audit actor label recorded when a transition is system-initiated (lifecycle
 * timers) rather than user-driven. The hash-chained entry stores this stable
 * label, while the nullable `escrow_logs.actor_id` column is written as NULL
 * (there is no system user row to reference).
 */
const SYSTEM_ACTOR_LABEL = 'system';

/** Guard that an inbound event string is one of the defined escrow events. */
export function assertKnownEvent(event: string): asserts event is DealEvent {
  if (!DEAL_EVENT_SET.has(event)) {
    throw new AppError('invalid_event', `Unknown deal event: '${event}'.`, 422);
  }
}

/**
 * Apply a single escrow transition atomically. Resolves with the resulting
 * state and the new audit entry hash, or rejects with an `AppError`
 * (`deal_not_found`, `invalid_transition`, or `concurrent_update`).
 */
export async function applyDealTransition(input: ApplyTransitionInput): Promise<TransitionResult> {
  assertKnownEvent(input.event);
  const visibility: EscrowLogVisibility = input.visibility ?? 'user';
  const client: TxClient = await acquireClient();

  try {
    await client.query('BEGIN');

    const current = await loadDealVersion(client, input.dealId);
    if (current === null) {
      throw new AppError('deal_not_found', `Deal '${input.dealId}' was not found.`, 404);
    }

    // Pure, server-authoritative decision; throws on an undefined edge.
    const plan = planTransition(current.status, input.event, current.version_no);

    const prevHash = await loadLastEntryHash(client, input.dealId);
    const createdAt = new Date().toISOString();
    const entry = appendEntry(
      {
        dealId: input.dealId,
        fromState: plan.from,
        toState: plan.to,
        actorId: input.actorId ?? SYSTEM_ACTOR_LABEL,
        requestId: input.requestId,
        createdAt,
      },
      prevHash,
    );

    const updated = await applyDealStatus(
      client,
      input.dealId,
      plan.to,
      plan.readVersion,
      plan.nextVersion,
    );
    if (updated === 0) {
      // A concurrent writer advanced version_no first (Property 7).
      throw new AppError(
        'concurrent_update',
        'The deal was modified concurrently; reload and retry with the latest version.',
        409,
      );
    }

    await insertEscrowLog(client, entry, input.event, visibility, input.actorId);

    let dealRow: { buyer_id: string; seller_id: string; middleman_id: string | null } | null = null;
    const dealRes = await client.query<{
      buyer_id: string;
      seller_id: string;
      middleman_id: string | null;
    }>(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1`, [input.dealId]);
    dealRow = dealRes.rows[0] ?? null;

    if (plan.to === 'Released') {
      const sellerId = dealRow?.seller_id;
      if (sellerId) {
        await client.query(
          `UPDATE users SET trust_level = LEAST(trust_level + 1, 5) WHERE id = $1`,
          [sellerId],
        );
      }
    }

    await client.query('COMMIT');

    // MONEY-CRIT-1 FIX: Wire SLA timer window starts immediately after the
    // committed state transition. Each state that opens a clock gets the matching
    // window set. Non-fatal: a timer write failure is logged but does NOT undo
    // the already-committed deal transition.
    try {
      if (plan.to === 'Confirmed') {
        await startFundingWindow(input.dealId);
      } else if (plan.to === 'SellerHandover') {
        await startCompletionClock(input.dealId);
      } else if (plan.to === 'Delivered') {
        await startInspectionWindow(input.dealId);
      }
    } catch (timerErr) {
      logger.error(
        {
          dealId: input.dealId,
          toState: plan.to,
          err: timerErr instanceof Error ? timerErr.message : String(timerErr),
        },
        'SLA timer window start failed after state transition — manual intervention may be needed',
      );
    }

    try {
      const redis = getRedis();
      await redis.publish(
        'realtime:deal:events',
        JSON.stringify({
          dealId: input.dealId,
          event: 'deal:update',
          payload: { dealId: input.dealId, from: plan.from, to: plan.to },
        }),
      );
      await redis.publish(
        'realtime:deal:events',
        JSON.stringify({
          dealId: input.dealId,
          event: 'deal:state_changed',
          payload: { dealId: input.dealId, from: plan.from, to: plan.to },
        }),
      );
    } catch {
      // ignore
    }

    if (dealRow) {
      let eventType: 'deal.funded' | 'deal.completed' | 'deal.disputed' | null = null;
      if (plan.to === 'Funded') eventType = 'deal.funded';
      else if (plan.to === 'Released') eventType = 'deal.completed';
      else if (plan.to === 'Disputed') eventType = 'deal.disputed';

      if (eventType) {
        const { triggerWebhook } = await import('../webhooks/webhook.service.js');
        const payload = {
          deal_id: input.dealId,
          from_state: plan.from,
          to_state: plan.to,
          event: input.event,
          version: plan.nextVersion,
        };
        await triggerWebhook(dealRow.buyer_id, eventType, payload);
        await triggerWebhook(dealRow.seller_id, eventType, payload);
        if (dealRow.middleman_id) {
          await triggerWebhook(dealRow.middleman_id, eventType, payload);
        }
      }
    }

    return {
      dealId: input.dealId,
      from: plan.from,
      to: plan.to,
      event: input.event,
      version: plan.nextVersion,
      entryHash: entry.entryHash,
    };
  } catch (err) {
    // Single best-effort rollback; ignore secondary rollback errors.
    try {
      await client.query('ROLLBACK');
    } catch {
      /* transaction already aborted or connection lost */
    }
    if (err instanceof InvalidTransitionError) {
      throw new AppError('invalid_transition', err.message, 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function markDealDone(
  userId: string,
  dealId: string,
): Promise<{ dealId: string; chatsClosed: number }> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      middleman_id: string | null;
    }>(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.buyer_id !== userId && deal.seller_id !== userId && deal.middleman_id !== userId) {
      throw new AppError('forbidden', 'Only a party to the deal can mark it done.', 403);
    }
    // Close all chat rooms for this deal.
    const chatRes = await client.query<{ rowCount: number }>(
      `UPDATE chats SET status = 'closed' WHERE deal_id = $1 AND status = 'open' RETURNING id`,
      [dealId],
    );
    await client.query('COMMIT');
    return { dealId, chatsClosed: chatRes.rowCount ?? 0 };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

export interface RequestMiddlemanResult {
  dealId: string;
  middlemanId: string;
  alreadyAssigned: boolean;
}

/**
 * Attach a middleman to a deal in one click — no invite, no verification.
 * Either the buyer or seller may request it. If a middleman is already
 * assigned, the call is idempotent. Otherwise an active middleman account
 * (other than the two parties) is auto-assigned. The buyer<->mm and seller<->mm
 * chat rooms already exist from deal creation, so chat works immediately.
 */
export async function requestMiddleman(
  userId: string,
  dealId: string,
): Promise<RequestMiddlemanResult> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      middleman_id: string | null;
    }>(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.buyer_id !== userId && deal.seller_id !== userId) {
      throw new AppError('forbidden', 'Only a party to the deal can request a middleman.', 403);
    }
    if (deal.middleman_id) {
      await client.query('COMMIT');
      return { dealId, middlemanId: deal.middleman_id, alreadyAssigned: true };
    }
    const mmRes = await client.query<{ id: string }>(
      `SELECT id FROM users
        WHERE account_type = 'middleman' AND account_status = 'active'
          AND id <> COALESCE($1, '00000000-0000-0000-0000-000000000000')
          AND id <> COALESCE($2, '00000000-0000-0000-0000-000000000000')
        ORDER BY created_at ASC
        LIMIT 1`,
      [deal.buyer_id, deal.seller_id],
    );
    const middlemanId = mmRes.rows[0]?.id;
    if (!middlemanId) {
      throw new AppError(
        'no_middleman_available',
        'No middleman is available right now. Please try again shortly.',
        503,
      );
    }
    await client.query(`UPDATE deals SET middleman_id = $2, updated_at = now() WHERE id = $1`, [
      dealId,
      middlemanId,
    ]);
    // Keep the linked connection in sync: the /connect chat gates the buyer_mm /
    // seller_mm channels (and the middleman's posting access) on the
    // CONNECTION's middleman_id, not the deal's. Without this, adding a
    // middleman to the deal would never reveal the middleman chat channels.
    await client.query(
      `UPDATE connections SET middleman_id = $2, updated_at = now()
        WHERE deal_id = $1 AND middleman_id IS NULL`,
      [dealId, middlemanId],
    );
    await client.query('COMMIT');
    return { dealId, middlemanId, alreadyAssigned: false };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

export interface AgreementResult {
  dealId: string;
  buyerAgreed: boolean;
  sellerAgreed: boolean;
  locked: boolean;
  lockedAt: string | null;
  /** Deal status after the agreement — 'Agreed' when both parties locked, else unchanged. */
  status: string;
}

/**
 * Mark the calling party's agreement on a deal. When BOTH the buyer and seller
 * have agreed the deal locks (immutable) AND the status advances to 'Agreed'
 * in the SAME transaction — so the caller sees the new status immediately
 * without needing a second round-trip. Idempotent: re-agreeing is a no-op.
 * Only the deal's buyer or seller may agree.
 */
export async function agreeToDeal(userId: string, dealId: string): Promise<AgreementResult> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      buyer_agreed_at: string | null;
      seller_agreed_at: string | null;
      locked_at: string | null;
      status: string;
      version_no: number;
    }>(
      `SELECT buyer_id, seller_id, buyer_agreed_at, seller_agreed_at, locked_at, status, version_no
         FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    // Once locked the deal is immutable — return current state idempotently.
    // STATUS REPAIR: if the deal was locked before the inline transition was
    // deployed, status may still be 'Created'/'Invited'. Fix it now so the
    // caller immediately sees 'Agreed' without needing a separate API call.
    if (deal.locked_at) {
      let repairedStatus = deal.status;
      if (
        (deal.status === 'Created' || deal.status === 'Invited') &&
        deal.buyer_agreed_at !== null &&
        deal.seller_agreed_at !== null
      ) {
        const prevHash = await loadLastEntryHash(client, dealId);
        const repairAt = new Date().toISOString();
        const repairReqId = `agree-repair:${dealId}:${Date.now()}`;
        const repairEntry = appendEntry(
          {
            dealId,
            fromState: deal.status as DealStatus,
            toState: 'Agreed',
            actorId: userId,
            requestId: repairReqId,
            createdAt: repairAt,
          },
          prevHash,
        );
        // UPDATE only if status is still in the stale set (guard against races)
        const repairRes = await client.query<{ id: string }>(
          `UPDATE deals SET status = 'Agreed', version_no = version_no + 1, updated_at = now()
            WHERE id = $1 AND status IN ('Created','Invited')
            RETURNING id`,
          [dealId],
        );
        if (repairRes.rowCount && repairRes.rowCount > 0) {
          await insertEscrowLog(client, repairEntry, 'PartiesAgreed', 'user', userId);
          repairedStatus = 'Agreed';
        }
      }
      await client.query('COMMIT');

      // Repair path: also advance through Agreed/Verified to Confirmed
      let repairStatus = repairedStatus;
      if (repairStatus === 'Agreed' || repairStatus === 'Verified') {
        if (repairStatus === 'Agreed') {
          try {
            await applyDealTransition({
              dealId, event: 'CodeVerified', actorId: userId,
              requestId: `repair-code:${dealId}:${Date.now()}`,
            });
            repairStatus = 'Verified';
          } catch { /* already past Verified */ }
        }
        try {
          await applyDealTransition({
            dealId, event: 'TermsAccepted', actorId: userId,
            requestId: `repair-terms:${dealId}:${Date.now()}`,
          });
          repairStatus = 'Confirmed';
        } catch { /* already Confirmed */ }
      }
      return {
        dealId,
        buyerAgreed: deal.buyer_agreed_at !== null,
        sellerAgreed: deal.seller_agreed_at !== null,
        locked: true,
        lockedAt: typeof deal.locked_at === 'string'
          ? deal.locked_at
          : new Date(deal.locked_at).toISOString(),
        status: repairStatus,
      };
    }
    const isBuyer = deal.buyer_id === userId;
    const isSeller = deal.seller_id === userId;
    if (!isBuyer && !isSeller) {
      throw new AppError('forbidden', 'Only the buyer or seller can agree to this deal.', 403);
    }

    let buyerAgreedAt = deal.buyer_agreed_at;
    let sellerAgreedAt = deal.seller_agreed_at;
    if (isBuyer && !buyerAgreedAt) {
      const r = await client.query<{ buyer_agreed_at: string }>(
        `UPDATE deals SET buyer_agreed_at = now(), updated_at = now() WHERE id = $1
         RETURNING buyer_agreed_at`,
        [dealId],
      );
      buyerAgreedAt = r.rows[0]?.buyer_agreed_at ?? buyerAgreedAt;
    }
    if (isSeller && !sellerAgreedAt) {
      const r = await client.query<{ seller_agreed_at: string }>(
        `UPDATE deals SET seller_agreed_at = now(), updated_at = now() WHERE id = $1
         RETURNING seller_agreed_at`,
        [dealId],
      );
      sellerAgreedAt = r.rows[0]?.seller_agreed_at ?? sellerAgreedAt;
    }

    let lockedAt = deal.locked_at;
    let finalStatus = deal.status;

    if (!lockedAt && buyerAgreedAt && sellerAgreedAt) {
      // Both parties have agreed — lock the deal AND advance to 'Agreed' atomically.
      const r = await client.query<{ locked_at: string }>(
        `UPDATE deals SET locked_at = now(), updated_at = now() WHERE id = $1
         RETURNING locked_at`,
        [dealId],
      );
      lockedAt = r.rows[0]?.locked_at ?? null;

      // Only advance status if the deal hasn't already been moved to Agreed
      // by the invite-acceptance path (acceptInvite also fires PartiesAgreed).
      if (deal.status === 'Created' || deal.status === 'Invited') {
        const prevHash = await loadLastEntryHash(client, dealId);
        const createdAt = new Date().toISOString();
        const reqId = `agree-lock:${dealId}:${Date.now()}`;
        const entry = appendEntry(
          {
            dealId,
            fromState: deal.status as DealStatus,
            toState: 'Agreed',
            actorId: userId,
            requestId: reqId,
            createdAt,
          },
          prevHash,
        );
        await client.query(
          `UPDATE deals SET status = 'Agreed', version_no = version_no + 1 WHERE id = $1`,
          [dealId],
        );
        await insertEscrowLog(client, entry, 'PartiesAgreed', 'user', userId);
        finalStatus = 'Agreed';
      }
    }

    await client.query('COMMIT');

    // Notify BOTH parties' open deal pages to refetch so the agreement / lock
    // state updates live. The lock→Agreed path also publishes via
    // applyDealTransition below, but a one-sided agree (waiting for the other
    // party) transitions nothing — without this, the counterparty would keep
    // showing "waiting to accept" until a manual refresh.
    try {
      const redis = getRedis();
      await redis.publish(
        'realtime:deal:events',
        JSON.stringify({ dealId, event: 'deal:update', payload: { dealId, locked: !!lockedAt } }),
      );
    } catch { /* realtime is best-effort; the page still works via refetch/poll */ }

    // AUTO-ADVANCE: Once both parties lock, jump directly to Confirmed so
    // buyers can fund the escrow immediately — no verification code exchange
    // or manual terms acceptance step is needed.
    if (finalStatus === 'Agreed') {
      try {
        await applyDealTransition({
          dealId, event: 'CodeVerified', actorId: userId,
          requestId: `auto-code:${dealId}:${Date.now()}`,
        });
        finalStatus = 'Verified';
      } catch { /* already Verified or Confirmed, continue */ }
      try {
        await applyDealTransition({
          dealId, event: 'TermsAccepted', actorId: userId,
          requestId: `auto-terms:${dealId}:${Date.now()}`,
        });
        finalStatus = 'Confirmed';
      } catch { /* already Confirmed, continue */ }
    }

    return {
      dealId,
      buyerAgreed: buyerAgreedAt !== null,
      sellerAgreed: sellerAgreedAt !== null,
      locked: lockedAt !== null,
      lockedAt,
      status: finalStatus,
    };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

export interface UpdateDealInput {
  dealAmountCents?: number;
  feePayer?: 'buyer' | 'seller' | 'split';
  feeSplitBuyerBps?: number | null;
  coin?: string;
  network?: string;
  itemDescription?: string | null;
  terms?: string | null;
}

export interface UpdateDealResult {
  dealId: string;
  updated: string[];
}

/**
 * Allow the seller to modify a deal's core parameters BEFORE both parties have
 * agreed (i.e. before locked_at is set). After locking the deal is immutable
 * for the parties; only the assigned middleman may adjust it post-lock.
 */
export async function updateDeal(
  sellerId: string,
  dealId: string,
  input: UpdateDealInput,
): Promise<UpdateDealResult> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      locked_at: string | null;
      status: string;
    }>(
      `SELECT buyer_id, seller_id, locked_at, status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    // Either party (buyer or seller) may edit the terms before the deal locks.
    if (deal.buyer_id !== sellerId && deal.seller_id !== sellerId) {
      throw new AppError('forbidden', 'Only a party to the deal can edit it before locking.', 403);
    }
    if (deal.locked_at) {
      throw new AppError('deal_locked', 'Deal is locked and can no longer be edited.', 409);
    }
    if (!['Created', 'Invited'].includes(deal.status)) {
      throw new AppError(
        'invalid_state',
        `Deal can only be edited in Created/Invited state (current: ${deal.status}).`,
        409,
      );
    }

    const setClauses: string[] = [];
    const values: unknown[] = [dealId]; // $1
    let i = 2;
    const updated: string[] = [];

    if (input.dealAmountCents !== undefined) {
      setClauses.push(`deal_amount = $${i++}`);
      values.push(input.dealAmountCents);
      updated.push('dealAmountCents');
    }
    if (input.feePayer !== undefined) {
      setClauses.push(`fee_payer = $${i++}`);
      values.push(input.feePayer);
      updated.push('feePayer');
    }
    if (input.feeSplitBuyerBps !== undefined) {
      setClauses.push(`fee_split_buyer_bps = $${i++}`);
      values.push(input.feeSplitBuyerBps);
      updated.push('feeSplitBuyerBps');
    }
    if (input.coin !== undefined) {
      setClauses.push(`coin = $${i++}`);
      values.push(input.coin);
      updated.push('coin');
    }
    if (input.network !== undefined) {
      setClauses.push(`network = $${i++}`);
      values.push(input.network);
      updated.push('network');
    }
    if (input.itemDescription !== undefined) {
      setClauses.push(`item_description = $${i++}`);
      values.push(input.itemDescription);
      updated.push('itemDescription');
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = now()`);
      // Any change to the terms invalidates prior agreement — both parties must
      // re-agree to the new terms before the deal can lock.
      setClauses.push(`buyer_agreed_at = NULL`);
      setClauses.push(`seller_agreed_at = NULL`);
      await client.query(
        `UPDATE deals SET ${setClauses.join(', ')} WHERE id = $1`,
        values,
      );
    }

    // Terms are stored in a separate versioned snapshot table.
    if (input.terms !== undefined && input.terms !== null && input.terms.trim().length > 0) {
      const versionRes = await client.query<{ max_version: number | null }>(
        `SELECT MAX(version) AS max_version FROM deal_terms WHERE deal_id = $1`,
        [dealId],
      );
      const nextVersion = (versionRes.rows[0]?.max_version ?? 0) + 1;
      await client.query(
        `INSERT INTO deal_terms (deal_id, version, terms_snapshot) VALUES ($1, $2, $3)`,
        [dealId, nextVersion, input.terms.trim()],
      );
      updated.push('terms');
    }

    await client.query('COMMIT');
    return { dealId, updated };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

export interface MiddlemanUpdateDealInput {
  /** The amount change, in integer USD cents (null = no change). */
  dealAmountCents?: number | null;
  /** Free-text terms override (null = no change). */
  terms?: string | null;
  /**
   * Explicit status override. Only a limited set of manual overrides are
   * accepted here so the middleman cannot skip required business logic — the
   * state-machine handles automated transitions. Allowed values:
   *   - 'Cancelled'  : middleman cancels a locked/funded deal
   *   - 'Disputed'   : middleman opens a formal dispute
   *   - 'Released'   : middleman releases funds (marks done)
   *   - 'Refunded'   : middleman issues a full refund
   */
  statusOverride?: 'Cancelled' | 'Disputed' | 'Released' | 'Refunded' | null;
  /** Optional reason/note appended to the audit log. */
  note?: string | null;
}

export interface MiddlemanUpdateDealResult {
  dealId: string;
  amountChanged: boolean;
  termsChanged: boolean;
  statusChanged: boolean;
  newStatus: string | null;
}

// MONEY-CRIT-2 FIX: 'Released' and 'Refunded' are removed from the allowed set.
// Those states must only be reached through the real payout/refund services that
// perform actual money movement, idempotency checks, and ledger entries. Allowing
// a raw override to these states would freeze funds with no on-chain resolution.
const MIDDLEMAN_ALLOWED_STATUS_OVERRIDES = new Set<string>([
  'Cancelled',
  'Disputed',
]);

/**
 * Allow the assigned middleman to modify a deal after it has been locked.
 * Only the deal's own middleman may call this; buyer and seller cannot.
 * Runs in a single transaction so partial updates are never committed.
 */
export async function middlemanUpdateDeal(
  middlemanId: string,
  dealId: string,
  input: MiddlemanUpdateDealInput,
): Promise<MiddlemanUpdateDealResult> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      middleman_id: string | null;
      status: string;
      deal_amount: number | null;
    }>(
      `SELECT buyer_id, seller_id, middleman_id, status, deal_amount
         FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.middleman_id !== middlemanId) {
      throw new AppError(
        'forbidden',
        'Only the assigned middleman can modify this deal.',
        403,
      );
    }
    // Verify the caller is actually a middleman-role user so a buyer/seller
    // who guesses this endpoint cannot masquerade.
    const callerRes = await client.query<{ account_type: string }>(
      `SELECT account_type FROM users WHERE id = $1`,
      [middlemanId],
    );
    if (callerRes.rows[0]?.account_type !== 'middleman') {
      throw new AppError('forbidden', 'Only a middleman account can use this endpoint.', 403);
    }

    let amountChanged = false;
    let termsChanged = false;
    let statusChanged = false;
    let newStatus: string | null = null;

    // Update the deal amount when provided and different.
    if (
      input.dealAmountCents !== undefined &&
      input.dealAmountCents !== null &&
      input.dealAmountCents !== deal.deal_amount
    ) {
      if (input.dealAmountCents < 0) {
        throw new AppError(
          'invalid_amount',
          'Deal amount must be a non-negative integer (cents).',
          422,
        );
      }
      await client.query(
        `UPDATE deals SET deal_amount = $2, updated_at = now() WHERE id = $1`,
        [dealId, input.dealAmountCents],
      );
      amountChanged = true;
    }

    // Insert a new terms snapshot when provided and non-empty.
    if (input.terms !== undefined && input.terms !== null) {
      const trimmed = input.terms.trim();
      if (trimmed.length > 0) {
        // Get the next version number.
        const versionRes = await client.query<{ max_version: number | null }>(
          `SELECT MAX(version) AS max_version FROM deal_terms WHERE deal_id = $1`,
          [dealId],
        );
        const nextVersion = (versionRes.rows[0]?.max_version ?? 0) + 1;
        await client.query(
          `INSERT INTO deal_terms (deal_id, version, terms_snapshot)
           VALUES ($1, $2, $3)`,
          [dealId, nextVersion, trimmed],
        );
        termsChanged = true;
      }
    }

    // Apply a manual status override when requested.
    if (input.statusOverride !== undefined && input.statusOverride !== null) {
      if (!MIDDLEMAN_ALLOWED_STATUS_OVERRIDES.has(input.statusOverride)) {
        throw new AppError(
          'invalid_status_override',
          `Status override '${input.statusOverride}' is not permitted.`,
          422,
        );
      }
      // SEC-CRIT-3 FIX: Use proper hash-chain computation via appendEntry so
      // this override entry is cryptographically linked to its predecessor.
      const note = (input.note ?? '').trim() || `Middleman override to ${input.statusOverride}`;
      const overrideReqId = `middleman-override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const overridePrevHash = await loadLastEntryHash(client, dealId);
      const overrideCreatedAt = new Date().toISOString();
      const chainEntry = appendEntry(
        {
          dealId,
          fromState: deal.status,
          toState: input.statusOverride,
          actorId: middlemanId,
          requestId: overrideReqId,
          createdAt: overrideCreatedAt,
        },
        overridePrevHash,
      );

      await client.query(
        `UPDATE deals SET status = $2, updated_at = now() WHERE id = $1`,
        [dealId, input.statusOverride],
      );

      await client.query(
        `INSERT INTO escrow_logs
           (deal_id, action, actor_id, visibility, request_id, metadata, prev_hash, entry_hash, created_at)
         VALUES ($1, $2, $3, 'middleman_only', $4, $5::jsonb, $6, $7, $8::timestamptz)`,
        [
          dealId,
          'middleman_override',
          middlemanId,
          overrideReqId,
          JSON.stringify({
            from_state: deal.status,
            to_state: input.statusOverride,
            note,
          }),
          chainEntry.prevHash,
          chainEntry.entryHash,
          overrideCreatedAt,
        ],
      );
      newStatus = input.statusOverride;
      statusChanged = true;
    }

    await client.query('COMMIT');
    return { dealId, amountChanged, termsChanged, statusChanged, newStatus };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* already aborted */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Advance a deal that is stuck at SellerHandover / MiddlemanVerified with NO
 * middleman assigned, straight to Delivered. Either party (buyer or seller) may
 * trigger it. This unblocks deals that handed over before the auto-advance was
 * added, or any no-middleman deal. When a middleman IS assigned this is rejected
 * (the middleman must verify + deliver).
 */
export async function advanceDeliveryNoMiddleman(
  userId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  let status: string;
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      middleman_id: string | null;
      status: string;
    }>(`SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    const deal = dealRes.rows[0];
    if (!deal) throw new AppError('deal_not_found', 'Deal was not found.', 404);
    if (deal.buyer_id !== userId && deal.seller_id !== userId) {
      throw new AppError('forbidden', 'Only a party to the deal can advance it.', 403);
    }
    // The seller drives delivery (SellerHandover → Delivered) with no middleman
    // gate in between — the middleman only acts after Delivered. So this is
    // allowed whether or not a middleman is assigned.
    if (deal.status === 'Delivered') {
      await client.query('COMMIT');
      return { dealId, status: 'Delivered' };
    }
    if (!['SellerHandover', 'MiddlemanVerified'].includes(deal.status)) {
      throw new AppError('invalid_state', `Cannot advance from '${deal.status}'.`, 409);
    }
    status = deal.status;
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  const chain: Array<{ from: string[]; event: DealEvent }> = [
    { from: ['SellerHandover'], event: 'MiddlemanVerifiedTransfer' },
    { from: ['MiddlemanVerified'], event: 'DeliveredToBuyer' },
  ];
  let current = status;
  for (const step of chain) {
    if (!step.from.includes(current)) continue;
    const r = await applyDealTransition({
      dealId, event: step.event, actorId: userId, requestId: `${requestId}:${step.event}`,
    });
    current = r.to;
  }
  return { dealId, status: current };
}

/**
 * Middleman marks a deal complete — drives it through the remaining state
 * transitions to Released so both parties see the "Complete" stage. Used for
 * the simplified middleman-driven completion (Delivered → Released). Only the
 * deal's assigned middleman may call this. The real on-chain payout is handled
 * separately by the payout service; this advances the deal lifecycle status.
 */
export async function markDealComplete(
  middlemanId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  const client = await acquireClient();
  let status: string;
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{ middleman_id: string | null; status: string }>(
      `SELECT middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) throw new AppError('deal_not_found', 'Deal was not found.', 404);
    if (deal.middleman_id !== middlemanId) {
      throw new AppError('forbidden', 'Only the assigned middleman can complete this deal.', 403);
    }
    status = deal.status;
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  if (status === 'Released') {
    return { dealId, status: 'Released' };
  }

  // Chain the lifecycle events from the current state to Released.
  // Each step is guarded by the state machine; we stop if a step is invalid.
  const chain: Array<{ from: string[]; event: DealEvent }> = [
    { from: ['Delivered'], event: 'BuyerApproved' },
    { from: ['Approved'], event: 'PayoutEnteredReview' },
    { from: ['PayoutQueued'], event: 'PayoutReleased' },
  ];

  let current = status;
  for (const step of chain) {
    if (!step.from.includes(current)) continue;
    try {
      const r = await applyDealTransition({
        dealId,
        event: step.event,
        actorId: middlemanId,
        requestId: `${requestId}:${step.event}`,
      });
      current = r.to;
    } catch {
      // Stop on the first invalid transition; return whatever state we reached.
      break;
    }
  }

  return { dealId, status: current };
}

/**
 * Manually advance a deal from Confirmed → Funded. Used when the buyer has
 * sent payment and wants to proceed without waiting for the automatic
 * on-chain deposit-watcher (e.g. manual/off-chain settlement, or to unblock
 * the flow). Either the buyer or the assigned middleman may trigger it.
 */
export async function confirmFunding(
  userId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  let status: string;
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      buyer_id: string | null;
      seller_id: string | null;
      middleman_id: string | null;
      status: string;
    }>(`SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.buyer_id !== userId) {
      throw new AppError(
        'forbidden',
        'Only the buyer can confirm funding — funding is the buyer\'s step and must not be advanced by the seller or middleman.',
        403,
      );
    }
    if (deal.status === 'Funded') {
      await client.query('COMMIT');
      return { dealId, status: 'Funded' };
    }
    // Accept any locked-but-not-yet-funded state. The agree step is meant to
    // auto-advance Agreed → Verified → Confirmed, but if any of those silent
    // transitions did not complete the deal can be left at Agreed/Verified.
    // We chain the remaining events here so funding always works post-agree.
    if (!['Agreed', 'Verified', 'Confirmed', 'Amended'].includes(deal.status)) {
      throw new AppError(
        'invalid_state',
        `Funding can only be confirmed after both parties have agreed (currently ${deal.status}).`,
        409,
      );
    }
    status = deal.status;
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  // Chain whatever transitions are needed to reach Funded.
  const chain: Array<{ from: string[]; event: DealEvent }> = [
    { from: ['Agreed'], event: 'CodeVerified' },        // Agreed → Verified
    { from: ['Verified'], event: 'TermsAccepted' },     // Verified → Confirmed
    { from: ['Confirmed', 'Amended'], event: 'FundsHeld' }, // Confirmed → Funded
  ];
  let current = status;
  for (const step of chain) {
    if (!step.from.includes(current)) continue;
    const r = await applyDealTransition({
      dealId,
      event: step.event,
      actorId: userId,
      requestId: `${requestId}:${step.event}`,
    });
    current = r.to;
  }
  return { dealId, status: current };
}

/**
 * Seller confirms they have delivered the item to the buyer (or initiated
 * the digital transfer). Transitions the deal Funded → SellerHandover.
 * Only the deal's seller may call this.
 */
export async function sellerHandover(
  sellerId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{ seller_id: string | null; middleman_id: string | null; status: string }>(
      `SELECT seller_id, middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.seller_id !== sellerId) {
      throw new AppError('forbidden', 'Only the seller can submit a handover.', 403);
    }
    if (deal.status !== 'Funded') {
      throw new AppError(
        'invalid_state',
        `Handover can only be submitted from Funded state (currently ${deal.status}).`,
        409,
      );
    }

    // Every required detail must actually be filled in (whitespace does not
    // count) before the seller can mark the deal delivered. The payout address
    // and the seller's product/account details are mandatory.
    const payoutRes = await client.query<{ new_address_enc: string | null }>(
      `SELECT new_address_enc FROM wallet_change_requests
        WHERE deal_id = $1 AND wallet_type = 'payout'
        ORDER BY created_at DESC LIMIT 1`,
      [dealId],
    );
    if (!payoutRes.rows[0]?.new_address_enc) {
      throw new AppError('payout_address_required', 'Save your payout address before marking the deal delivered.', 422);
    }
    const sdRes = await client.query<{ product_name: string | null }>(
      `SELECT product_name FROM deal_seller_details WHERE deal_id = $1 LIMIT 1`,
      [dealId],
    );
    if (!sdRes.rows[0] || !(sdRes.rows[0].product_name ?? '').trim()) {
      throw new AppError('seller_details_required', 'Fill in your product / account details before marking the deal delivered.', 422);
    }

    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  // Single seller action: "Mark as delivered" carries Funded → Delivered with
  // no extra manual middle step and no middleman gate. The middleman only acts
  // after Delivered (to complete/release). SellerHandover and MiddlemanVerified
  // are internal technical transitions on the way to Delivered.
  await applyDealTransition({ dealId, event: 'SellerHandoverSent', actorId: sellerId, requestId });
  await applyDealTransition({ dealId, event: 'MiddlemanVerifiedTransfer', actorId: sellerId, requestId: `${requestId}:v` });
  const result = await applyDealTransition({ dealId, event: 'DeliveredToBuyer', actorId: sellerId, requestId: `${requestId}:d` });
  return { dealId, status: result.to };
}

/**
 * Middleman confirms that the seller has completed the handover.
 * Transitions the deal from SellerHandover → MiddlemanVerified.
 * Only the deal's assigned middleman account may call this.
 */
export async function verifyHandover(
  middlemanId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  // Verify the caller is the assigned middleman on this deal.
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{
      middleman_id: string | null;
      status: string;
    }>(`SELECT middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    const deal = dealRes.rows[0];
    if (!deal) {
      throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    if (deal.middleman_id !== middlemanId) {
      throw new AppError('forbidden', 'Only the assigned middleman can verify the handover.', 403);
    }
    if (deal.status !== 'SellerHandover') {
      throw new AppError(
        'invalid_transition',
        `Cannot verify handover: deal is in '${deal.status}' state, expected 'SellerHandover'.`,
        422,
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  const result = await applyDealTransition({
    dealId,
    event: 'MiddlemanVerifiedTransfer',
    actorId: middlemanId,
    requestId,
  });
  return { dealId, status: result.to };
}

/**
 * Middleman confirms delivery to the buyer.
 * Transitions MiddlemanVerified → Delivered.
 * Only the deal's assigned middleman account may call this.
 */
export async function deliverToBuyer(
  middlemanId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{ middleman_id: string | null; status: string }>(
      `SELECT middleman_id, status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) throw new AppError('deal_not_found', 'Deal was not found.', 404);
    if (deal.middleman_id !== middlemanId)
      throw new AppError('forbidden', 'Only the assigned middleman can deliver to the buyer.', 403);
    if (deal.status !== 'MiddlemanVerified')
      throw new AppError(
        'invalid_transition',
        `Cannot deliver: deal is in '${deal.status}', expected 'MiddlemanVerified'.`,
        422,
      );
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  const result = await applyDealTransition({
    dealId,
    event: 'DeliveredToBuyer',
    actorId: middlemanId,
    requestId,
  });
  return { dealId, status: result.to };
}

/**
 * Buyer approves the delivery, releasing funds.
 * Transitions Delivered → Approved.
 * Only the deal's buyer may call this.
 */
export async function approveDeal(
  buyerId: string,
  dealId: string,
  requestId: string,
): Promise<{ dealId: string; status: string }> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');
    const dealRes = await client.query<{ buyer_id: string | null; status: string }>(
      `SELECT buyer_id, status FROM deals WHERE id = $1 FOR UPDATE`,
      [dealId],
    );
    const deal = dealRes.rows[0];
    if (!deal) throw new AppError('deal_not_found', 'Deal was not found.', 404);
    if (deal.buyer_id !== buyerId)
      throw new AppError('forbidden', 'Only the buyer can approve the delivery.', 403);
    if (deal.status !== 'Delivered')
      throw new AppError(
        'invalid_transition',
        `Cannot approve: deal is in '${deal.status}', expected 'Delivered'.`,
        422,
      );
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }

  const result = await applyDealTransition({
    dealId,
    event: 'BuyerApproved',
    actorId: buyerId,
    requestId,
  });
  return { dealId, status: result.to };
}

export async function updateDealTags(
  userId: string,
  dealId: string,
  tags: string[],
): Promise<void> {
  const client = await acquireClient();
  try {
    await client.query('BEGIN');

    // 1. Verify user is a party of the deal
    const dealCheck = await client.query(
      `SELECT 1 FROM deals
        WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR middleman_id = $2)
        LIMIT 1`,
      [dealId, userId],
    );
    if (dealCheck.rows.length === 0) {
      throw new AppError('deal_not_found', 'Deal was not found or you are not a party to it.', 404);
    }

    // 2. Delete existing tags
    await client.query(`DELETE FROM deal_tags WHERE user_id = $1 AND deal_id = $2`, [
      userId,
      dealId,
    ]);

    // 3. Insert new tags
    for (const tag of tags) {
      await client.query(
        `INSERT INTO deal_tags (user_id, deal_id, label)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, deal_id, label) DO NOTHING`,
        [userId, dealId, tag],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback failure is logged by the DB driver; the original error is re-thrown below.
    }
    throw err;
  } finally {
    client.release();
  }
}
