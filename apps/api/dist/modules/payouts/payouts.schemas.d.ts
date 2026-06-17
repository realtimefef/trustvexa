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
/** `:payoutId` path param for the approve/broadcast endpoints. */
export declare const payoutIdParamSchema: z.ZodObject<{
    payoutId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    payoutId: string;
}, {
    payoutId: string;
}>;
export type PayoutIdParam = z.infer<typeof payoutIdParamSchema>;
/**
 * Refund cause set — mirrors `RefundCause` in `money/payout-queue.ts`. The
 * cause decides whether the platform absorbs the network/gas cost or the buyer
 * bears it (see `refundFeeSmallestUnit`).
 */
export declare const refundCauseSchema: z.ZodEnum<["platform_fault", "seller_no_delivery", "dispute_buyer_favor", "buyer_cancel", "mutual_cancel"]>;
/** Body for `POST /refunds/by-deal/:id/process`. */
export declare const processRefundSchema: z.ZodObject<{
    cause: z.ZodEnum<["platform_fault", "seller_no_delivery", "dispute_buyer_favor", "buyer_cancel", "mutual_cancel"]>;
    reason: z.ZodString;
    gasCostSmallestUnit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    cause: "platform_fault" | "seller_no_delivery" | "dispute_buyer_favor" | "buyer_cancel" | "mutual_cancel";
    gasCostSmallestUnit?: string | undefined;
}, {
    reason: string;
    cause: "platform_fault" | "seller_no_delivery" | "dispute_buyer_favor" | "buyer_cancel" | "mutual_cancel";
    gasCostSmallestUnit?: string | undefined;
}>;
export type ProcessRefundBody = z.infer<typeof processRefundSchema>;
//# sourceMappingURL=payouts.schemas.d.ts.map