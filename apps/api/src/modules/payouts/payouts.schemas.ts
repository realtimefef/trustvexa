/**
 * Request schemas for the payouts/refunds operator router.
 *
 * The approve/broadcast endpoints carry no body (the payout is identified by
 * its route id and the acting middleman by the verified JWT), so only their
 * path params are validated. The refund endpoint is money-moving, so its body
 * is strictly validated: a refund `cause` from the fixed cause set (which drives
 * the fee rule in `payout-queue.ts`), a required human reason, and an optional
 * non-negative integer gas cost (sent as a decimal string to avoid JSON number
 * precision loss).
 */
import { z } from 'zod';

const smallestUnitString = z.string().regex(/^\d+$/u, 'must be a non-negative integer string');

/** `:payoutId` path param for the approve/broadcast endpoints. */
export const payoutIdParamSchema = z.object({ payoutId: z.string().uuid() });
export type PayoutIdParam = z.infer<typeof payoutIdParamSchema>;

/**
 * Refund cause set — mirrors `RefundCause` in `money/payout-queue.ts`. The
 * cause decides whether the platform absorbs the network/gas cost or the buyer
 * bears it (see `refundFeeSmallestUnit`).
 */
export const refundCauseSchema = z.enum([
  'platform_fault',
  'seller_no_delivery',
  'dispute_buyer_favor',
  'buyer_cancel',
  'mutual_cancel',
]);

/** Body for `POST /refunds/by-deal/:id/process`. */
export const processRefundSchema = z.object({
  cause: refundCauseSchema,
  reason: z.string().trim().min(1).max(2000),
  gasCostSmallestUnit: smallestUnitString.optional(),
});
export type ProcessRefundBody = z.infer<typeof processRefundSchema>;
