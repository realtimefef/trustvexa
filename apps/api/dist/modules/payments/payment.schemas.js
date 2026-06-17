/**
 * Zod schemas for the payments/escrow HTTP surface.
 *
 * The deal id path param reuses the canonical `dealIdParamSchema` from the deal
 * module so every `/deals/:id/...` route validates the id identically (slot 5).
 * Bodies are intentionally minimal: the buyer submits a chain tx hash (with an
 * optional uploaded screenshot file key) as a payment proof, or sets a refund
 * wallet address. Chain-specific address/tx-hash validity is asserted in the
 * service against the deal's network (the format differs per chain), so these
 * schemas only enforce shape and sane length bounds.
 */
import { z } from 'zod';
export { dealIdParamSchema } from '../deal/deal.schemas.js';
/** Buyer-submitted payment proof: a tx hash plus an optional screenshot key. */
export const submitTxBodySchema = z
    .object({
    txHash: z.string().trim().min(4).max(200),
    screenshotFileKey: z.string().trim().min(1).max(512).optional(),
})
    .strict();
/** Buyer-set refund wallet address (chain-specific validity checked in service). */
export const refundWalletBodySchema = z
    .object({
    address: z.string().trim().min(20).max(120),
})
    .strict();
//# sourceMappingURL=payment.schemas.js.map