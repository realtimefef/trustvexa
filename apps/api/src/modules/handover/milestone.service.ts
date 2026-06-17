/**
 * Milestone release + delivery-checklist write flows (task 7.2).
 *
 * The milestone release is the partial-payout money flow for high-value or
 * multi-step deals. It runs through the shared money-write contract so it is
 * idempotent (Idempotency-Key), optimistically locked (deal `version_no`), and
 * atomic: the milestone update, the balanced ledger posting (a partial seller
 * payout out of escrow), and the deal-state transition all commit together or
 * not at all. A milestone may only be released by the assigned middleman, only
 * while the deal is in `PayoutQueued`, only once its delivery checklist is
 * complete, and only while the cumulative released amount never exceeds the
 * escrow. The final milestone moves the deal to `Released`; otherwise it
 * returns to `PayoutQueued` for the next milestone. (Requirements 40.1-40.6,
 * 17.6, 17.7, 17.11-17.14, 24.7)
 */
import { AppError, notFound } from '../../errors/app-error.js';
import { sellerPayoutPostings } from '../money/ledger.js';
import { postEntryGroup } from '../money/ledger.repository.js';
import { lockDealVersion, runMoneyWrite } from '../money/money-write.js';
import {
  evaluateMilestoneRelease,
  pendingRequired,
  type ChecklistItem,
  type MilestoneReleaseError,
} from './milestones.js';
import {
  getMilestone,
  listDeliveryChecklist,
  lockDeal,
  markDeliveryChecklistItem,
  markMilestoneReleased,
  setDealStatusFrom,
  sumReleasedMilestones,
  type TxClient,
} from './milestone.repository.js';

const PAYOUT_QUEUED = 'PayoutQueued';
const RELEASED = 'Released';

const RELEASE_ERROR_STATUS: Record<MilestoneReleaseError, number> = {
  not_middleman: 403,
  already_released: 409,
  checklist_incomplete: 409,
  exceeds_escrow: 409,
};

function checklistFromRows(
  rows: ReadonlyArray<{ item_key: string; checked_at: string | null }>,
): ChecklistItem[] {
  // Every persisted delivery-checklist row is a required item; it is "done"
  // once it has been checked off (`checked_at` set).
  return rows.map((r) => ({ code: r.item_key, required: true, done: r.checked_at !== null }));
}

export interface ReleaseMilestoneInput {
  middlemanId: string;
  dealId: string;
  milestoneId: string;
  idempotencyKey: string;
}

export interface ReleaseMilestoneResult {
  milestoneId: string;
  releasedSmallestUnit: string;
  cumulativeReleasedSmallestUnit: string;
  isFinal: boolean;
  toState: string;
}

/** Release one milestone as the assigned middleman (money-moving, atomic). */
export async function releaseMilestone(
  input: ReleaseMilestoneInput,
): Promise<ReleaseMilestoneResult> {
  const { result } = await runMoneyWrite<ReleaseMilestoneResult>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'release_milestone',
    userId: input.middlemanId,
    dealId: input.dealId,
    payload: { dealId: input.dealId, milestoneId: input.milestoneId },
    work: async (client) => {
      const tx = client as unknown as TxClient;
      const deal = await lockDeal(tx, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.middleman_id !== input.middlemanId) {
        throw new AppError(
          'forbidden',
          'Only the assigned middleman can release a milestone.',
          403,
        );
      }
      if (deal.status !== PAYOUT_QUEUED) {
        throw new AppError(
          'not_payout_queued',
          'A milestone can only be released while the deal is in the payout queue.',
          409,
        );
      }

      const milestone = await getMilestone(tx, input.dealId, input.milestoneId);
      if (milestone === null) throw notFound('Milestone was not found.');

      const checklistRows = await listDeliveryChecklist(tx, input.dealId);
      const checklist = checklistFromRows(checklistRows);
      const escrow = BigInt(deal.amount_smallest_unit ?? '0');
      const amount = BigInt(milestone.amount_smallest_unit ?? '0');
      const alreadyReleased = await sumReleasedMilestones(tx, input.dealId);

      const decision = evaluateMilestoneRelease({
        milestone: { id: milestone.id, amount, released: milestone.status === 'released' },
        checklist,
        isMiddleman: true,
        escrowAmount: escrow,
        alreadyReleased,
      });
      if (!decision.ok && decision.error) {
        if (decision.error === 'checklist_incomplete') {
          const pending = pendingRequired(checklist).map((i) => i.code);
          throw new AppError(
            'checklist_incomplete',
            `The delivery checklist is not complete: ${pending.join(', ') || 'no items recorded'}.`,
            RELEASE_ERROR_STATUS.checklist_incomplete,
          );
        }
        throw new AppError(
          decision.error,
          `Milestone release rejected: ${decision.error.replace(/_/gu, ' ')}.`,
          RELEASE_ERROR_STATUS[decision.error],
        );
      }

      // Optimistic lock: bump the deal version (aborts on a concurrent writer).
      await lockDealVersion(client, input.dealId, deal.version_no);

      const marked = await markMilestoneReleased(tx, input.milestoneId);
      if (marked === 0) {
        throw new AppError(
          'milestone_release_conflict',
          'The milestone state changed; reload and retry.',
          409,
        );
      }

      // Partial seller payout out of escrow for this milestone amount.
      if (amount > 0n) {
        await postEntryGroup(
          client,
          sellerPayoutPostings(
            { coin: deal.coin, network: deal.network, dealId: input.dealId },
            amount,
          ),
          { dealId: input.dealId },
        );
      }

      const toState = decision.isFinal ? RELEASED : PAYOUT_QUEUED;
      if (decision.isFinal) {
        await setDealStatusFrom(tx, input.dealId, PAYOUT_QUEUED, RELEASED);
      }

      return {
        milestoneId: input.milestoneId,
        releasedSmallestUnit: amount.toString(),
        cumulativeReleasedSmallestUnit: decision.nextReleasedTotal.toString(),
        isFinal: decision.isFinal,
        toState,
      };
    },
  });

  return result;
}

export interface MarkChecklistInput {
  middlemanId: string;
  dealId: string;
  checklistType: 'account_sale' | 'digital_product';
  itemKey: string;
  idempotencyKey: string;
}

/** Record a delivery-checklist item as completed (middleman-only, idempotent). */
export async function markChecklistItem(input: MarkChecklistInput): Promise<{ checked: boolean }> {
  const { result } = await runMoneyWrite<{ checked: boolean }>({
    idempotencyKey: input.idempotencyKey,
    actionType: 'mark_delivery_checklist',
    userId: input.middlemanId,
    dealId: input.dealId,
    payload: {
      dealId: input.dealId,
      checklistType: input.checklistType,
      itemKey: input.itemKey,
    },
    work: async (client) => {
      const tx = client as unknown as TxClient;
      const deal = await lockDeal(tx, input.dealId);
      if (deal === null) throw notFound('Deal was not found.');
      if (deal.middleman_id !== input.middlemanId) {
        throw new AppError(
          'forbidden',
          'Only the assigned middleman can update the delivery checklist.',
          403,
        );
      }
      await markDeliveryChecklistItem(tx, {
        dealId: input.dealId,
        checklistType: input.checklistType,
        itemKey: input.itemKey,
        checkedBy: input.middlemanId,
      });
      return { checked: true };
    },
  });
  return result;
}
