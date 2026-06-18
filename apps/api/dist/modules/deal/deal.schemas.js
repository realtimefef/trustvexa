/**
 * Zod schemas for deal creation, duplication, and drafts (task 4.1).
 *
 * Shared with the client via re-export so both sides validate identically (the
 * API middleware runs these in slot 5). Amount bounds ($400-$50,000 held as
 * integer cents) are enforced here for real creation; drafts intentionally
 * allow partial / half-set-up data (Requirement 8.6) and so skip the bounds.
 * The coin/network allow-list pins each coin to the chains it can settle on.
 * (Requirements 8.6, 8.7, 18.1, 18.2, 18.10, 18.11)
 */
import { SUPPORTED_COINS, SUPPORTED_NETWORKS } from '@trustvexa/shared';
import { z } from 'zod';
import { MAX_DEAL_AMOUNT_CENTS, MIN_DEAL_AMOUNT_CENTS } from './deal-amount.js';
export const feePayerSchema = z.enum(['buyer', 'seller', 'split']);
export const networkModeSchema = z.enum(['mainnet', 'testnet']);
export const productTypeSchema = z.enum(['digital', 'account']);
const coinSchema = z.enum(SUPPORTED_COINS);
const networkSchema = z.enum(SUPPORTED_NETWORKS);
/**
 * Which networks each coin may settle on (Requirement 18.1-18.2). USDT is
 * multi-network; each native coin pins to its own chain.
 */
export const COIN_NETWORK_SUPPORT = {
    USDT: ['TRON', 'ETH', 'BNB', 'SOLANA'],
    SOL: ['SOLANA'],
    BNB: ['BNB'],
    ETH: ['ETH'],
    TRX: ['TRON'],
};
/** True when `coin` is allowed to settle on `network`. */
export function isCoinNetworkSupported(coin, network) {
    return COIN_NETWORK_SUPPORT[coin].includes(network);
}
/**
 * Payload for creating a real deal. The amount is validated to the $400-$50,000
 * range here (Requirements 18.10, 18.11) and re-asserted server-side in the
 * service so the bound is never client-trusted.
 */
export const createDealSchema = z
    .object({
    coin: coinSchema,
    network: networkSchema,
    networkMode: networkModeSchema.optional(),
    isPractice: z.boolean().optional(),
    productType: productTypeSchema.optional(),
    itemDescription: z.string().max(5_000).optional(),
    dealAmountCents: z.number().int().min(MIN_DEAL_AMOUNT_CENTS).max(MAX_DEAL_AMOUNT_CENTS),
    feePayer: feePayerSchema,
    // Buyer's share of the platform fee when feePayer === 'split', in basis
    // points (0–10,000). Omitted/ignored for buyer/seller. Defaults to 5,000
    // (an even 50/50 split) server-side. (Requirement 15.5)
    feeSplitBuyerBps: z.number().int().min(0).max(10_000).optional(),
    priceTolerancePct: z.number().min(0).max(100).optional(),
    terms: z.string().max(20_000).optional(),
    inspectionWindowDays: z.number().int().min(0).max(365).optional(),
    templateId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    tags: z.array(z.string().min(1).max(30)).max(10).optional(),
    preferredMiddlemanId: z.string().uuid().optional(),
    // When creating a deal from a connection (pre-deal conversation), the
    // connection id links the two parties and the creator's chosen role decides
    // who is buyer vs seller. The other participant gets the opposite role.
    connectionId: z.string().uuid().optional(),
    creatorRole: z.enum(['buyer', 'seller']).optional(),
    // Requirement 9.1: an explicit legal-item confirmation is mandatory.
    confirmLegal: z.literal(true),
})
    .strict()
    .superRefine((val, ctx) => {
    if (!isCoinNetworkSupported(val.coin, val.network)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['network'],
            message: `Coin ${val.coin} is not supported on network ${val.network}.`,
        });
    }
});
/**
 * Draft payload (Requirement 8.6). Every field is optional because a draft is a
 * half-set-up deal, and `.strict()` rejects unknown keys so the encrypted blob
 * cannot become a dumping ground for arbitrary counterparty PII before the
 * KeyProvider is wired.
 */
export const draftDataSchema = z
    .object({
    coin: coinSchema.optional(),
    network: networkSchema.optional(),
    networkMode: networkModeSchema.optional(),
    isPractice: z.boolean().optional(),
    productType: productTypeSchema.optional(),
    dealAmountCents: z.number().int().min(0).max(MAX_DEAL_AMOUNT_CENTS).optional(),
    feePayer: feePayerSchema.optional(),
    feeSplitBuyerBps: z.number().int().min(0).max(10_000).optional(),
    priceTolerancePct: z.number().min(0).max(100).optional(),
    terms: z.string().max(20_000).optional(),
    inspectionWindowDays: z.number().int().min(0).max(365).optional(),
    templateId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
})
    .strict();
export const saveDraftSchema = z.object({
    draftId: z.string().uuid().optional(),
    lastStep: z.string().min(1).max(64),
    data: draftDataSchema,
});
export const dealIdParamSchema = z.object({ id: z.string().uuid() });
export const draftIdParamSchema = z.object({ id: z.string().uuid() });
export const updateTagsSchema = z.object({
    tags: z.array(z.string().min(1).max(30)).max(10),
});
/**
 * Schema for the seller's pre-lock deal edit (PATCH /deals/:id).
 */
export const updateDealSchema = z
    .object({
    dealAmountCents: z
        .number()
        .int()
        .min(MIN_DEAL_AMOUNT_CENTS)
        .max(MAX_DEAL_AMOUNT_CENTS)
        .optional(),
    feePayer: feePayerSchema.optional(),
    feeSplitBuyerBps: z.number().int().min(0).max(10_000).optional().nullable(),
    coin: coinSchema.optional(),
    network: networkSchema.optional(),
    itemDescription: z.string().max(5_000).optional().nullable(),
    terms: z.string().max(20_000).optional().nullable(),
})
    .strict()
    .superRefine((val, ctx) => {
    if (val.coin !== undefined && val.network !== undefined) {
        if (!isCoinNetworkSupported(val.coin, val.network)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['network'],
                message: `Coin ${val.coin} is not supported on network ${val.network}.`,
            });
        }
    }
});
/**
 * Schema for the middleman-only deal update endpoint.
 * All fields are optional — only provided fields are applied.
 */
export const middlemanUpdateDealSchema = z.object({
    dealAmountCents: z.number().int().min(0).optional().nullable(),
    terms: z.string().max(20_000).optional().nullable(),
    statusOverride: z
        .enum(['Cancelled', 'Disputed', 'Released', 'Refunded'])
        .optional()
        .nullable(),
    note: z.string().max(2000).optional().nullable(),
});
//# sourceMappingURL=deal.schemas.js.map