/**
 * Refund processing service (operator, money-moving).
 *
 * Processes a buyer refund for a deal as the deal's assigned middleman (the 403
 * check mirrors `dispute.service`). Runs through `runMoneyWrite`, so it is
 * idempotent (Idempotency-Key), optimistically locked (deal `version_no`), and
 * atomic: the refund status event, the balanced double-entry refund posting, and
 * the deal-state transition all commit together. The cause-based fee rule
 * (`refundAmountSmallestUnit`) decides whether the buyer bears the network/gas
 * cost. A second, terminal refund is suppressed (idempotent at the domain level)
 * so a deal is never refunded twice.
 */
import { AppError, notFound } from '../../errors/app-error.js';
import { getRedis } from '@trustvexa/shared';
import { buyerRefundPostings } from '../money/ledger.js';
import { postEntryGroup } from '../money/ledger.repository.js';
import { lockDealVersion, runMoneyWrite } from '../money/money-write.js';
import { refundAmountSmallestUnit, type RefundCause } from '../money/payout-queue.js';
import {
  hasProcessedRefund,
  insertRefundStatusEvent,
  lockDealForPayout,
  markDealRefunded,
} from './payouts-write.repository.js';

/** Deal statuses from which a refund may be processed. */
const REFUNDABLE_DEAL_STATUSES: ReadonlySet<string> = new Set([
  'Funded',
  'Disputed',
  'PayoutQueued',
  'Approved',
  'Paused',
]);

export interface ProcessRefundInput {
  middlemanId: string;
  dealId: string;
  idempotencyKey: string;
  cause: RefundCause;
  reason: string;
  gasCostSmallestUnit?: string;
}

export interface ProcessRefundResult {
  dealId: string;
  status: string;
  cause: RefundCause;
  refundedAmountSmallestUnit: string;
  refundEventId: string | null;
  alreadyProcessed: boolean;
}

export async function processRefundForDeal(
  input: ProcessRefundInput,
): Promise<ProcessRefundResult> {
  const { result } = await runMoneyWrite<ProcessRefundResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'process_refund',
    userId: input.middlemanId,
    dealId: input.dealId,
    payload: {
      dealId: input.dealId,
      cause: input.cause,
      reason: input.reason,
      gasCostSmallestUnit: input.gasCostSmallestUnit ?? '0',
    },
    work: async (client) => {
      const deal = await lockDealForPayout(client, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.middleman_id !== input.middlemanId) {
        throw new AppError(
          'forbidden',
          'Only the assigned middleman can process this refund.',
          403,
        );
      }

      // Idempotent at the domain level: never refund a deal twice.
      if (await hasProcessedRefund(client, deal.id)) {
        return {
          dealId: deal.id,
          status: 'Refunded',
          cause: input.cause,
          refundedAmountSmallestUnit: '0',
          refundEventId: null,
          alreadyProcessed: true,
        };
      }

      if (!REFUNDABLE_DEAL_STATUSES.has(deal.status)) {
        throw new AppError(
          'deal_not_refundable',
          `A deal in status '${deal.status}' cannot be refunded.`,
          409,
        );
      }

      const escrowed = BigInt(deal.amount_smallest_unit ?? '0');
      const gasCost = BigInt(input.gasCostSmallestUnit ?? '0');
      const refundAmount = refundAmountSmallestUnit(escrowed, input.cause, gasCost);

      // Optimistic lock: bump the deal version (aborts on a concurrent writer).
      await lockDealVersion(client, deal.id, deal.version_no);

      const refundEventId = await insertRefundStatusEvent(client, {
        dealId: deal.id,
        statusStep: 'refunded',
        message: `Refund processed (${input.cause}): ${input.reason}`,
      });

      // Post the balanced refund group via the existing ledger helpers. A zero
      // refund (e.g. the gas fee fully consumed the escrow) records no posting.
      if (refundAmount > 0n) {
        const group = buyerRefundPostings(
          { coin: deal.coin, network: deal.network, dealId: deal.id },
          refundAmount,
        );
        await postEntryGroup(client, group, { dealId: deal.id });
      }

      await markDealRefunded(client, deal.id, deal.status);

      // MONEY-HIGH-6 FIX: Cancel any pending/approved payouts for this deal so
      // the orphaned rows don't show as 'approved' after the deal is refunded.
      // This prevents misleading audit records and lifecycle query confusion.
      await client.query(
        `UPDATE payout_queue
            SET status = 'cancelled', updated_at = now()
          WHERE deal_id = $1
            AND status IN ('pending', 'approved')`,
        [deal.id],
      );

      return {
        dealId: deal.id,
        status: 'Refunded',
        cause: input.cause,
        refundedAmountSmallestUnit: refundAmount.toString(),
        refundEventId,
        alreadyProcessed: false,
      };
    },
  });

  if (result && !result.alreadyProcessed) {
    try {
      const redis = getRedis();
      await redis.publish(
        'realtime:deal:events',
        JSON.stringify({
          dealId: input.dealId,
          event: 'deal:update',
          payload: { dealId: input.dealId, status: 'Refunded' },
        }),
      );
      await redis.publish(
        'realtime:deal:events',
        JSON.stringify({
          dealId: input.dealId,
          event: 'deal:state_changed',
          payload: { dealId: input.dealId, status: 'Refunded' },
        }),
      );
    } catch {
      // ignore
    }
  }

  return result;
}
