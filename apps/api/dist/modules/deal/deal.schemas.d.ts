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
export type SupportedCoin = (typeof SUPPORTED_COINS)[number];
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];
export declare const feePayerSchema: z.ZodEnum<["buyer", "seller", "split"]>;
export declare const networkModeSchema: z.ZodEnum<["mainnet", "testnet"]>;
export declare const productTypeSchema: z.ZodEnum<["digital", "account"]>;
/**
 * Which networks each coin may settle on (Requirement 18.1-18.2). USDT is
 * multi-network; each native coin pins to its own chain.
 */
export declare const COIN_NETWORK_SUPPORT: Readonly<Record<SupportedCoin, readonly SupportedNetwork[]>>;
/** True when `coin` is allowed to settle on `network`. */
export declare function isCoinNetworkSupported(coin: SupportedCoin, network: SupportedNetwork): boolean;
/**
 * Payload for creating a real deal. The amount is validated to the $400-$50,000
 * range here (Requirements 18.10, 18.11) and re-asserted server-side in the
 * service so the bound is never client-trusted.
 */
export declare const createDealSchema: z.ZodEffects<z.ZodObject<{
    coin: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
    network: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
    networkMode: z.ZodOptional<z.ZodEnum<["mainnet", "testnet"]>>;
    isPractice: z.ZodOptional<z.ZodBoolean>;
    productType: z.ZodOptional<z.ZodEnum<["digital", "account"]>>;
    itemDescription: z.ZodOptional<z.ZodString>;
    dealAmountCents: z.ZodNumber;
    feePayer: z.ZodEnum<["buyer", "seller", "split"]>;
    feeSplitBuyerBps: z.ZodOptional<z.ZodNumber>;
    priceTolerancePct: z.ZodOptional<z.ZodNumber>;
    terms: z.ZodOptional<z.ZodString>;
    inspectionWindowDays: z.ZodOptional<z.ZodNumber>;
    templateId: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    preferredMiddlemanId: z.ZodOptional<z.ZodString>;
    connectionId: z.ZodOptional<z.ZodString>;
    creatorRole: z.ZodOptional<z.ZodEnum<["buyer", "seller"]>>;
    confirmLegal: z.ZodLiteral<true>;
}, "strict", z.ZodTypeAny, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    dealAmountCents: number;
    feePayer: "buyer" | "seller" | "split";
    confirmLegal: true;
    terms?: string | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    itemDescription?: string | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
    tags?: string[] | undefined;
    preferredMiddlemanId?: string | undefined;
    connectionId?: string | undefined;
    creatorRole?: "buyer" | "seller" | undefined;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    dealAmountCents: number;
    feePayer: "buyer" | "seller" | "split";
    confirmLegal: true;
    terms?: string | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    itemDescription?: string | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
    tags?: string[] | undefined;
    preferredMiddlemanId?: string | undefined;
    connectionId?: string | undefined;
    creatorRole?: "buyer" | "seller" | undefined;
}>, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    dealAmountCents: number;
    feePayer: "buyer" | "seller" | "split";
    confirmLegal: true;
    terms?: string | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    itemDescription?: string | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
    tags?: string[] | undefined;
    preferredMiddlemanId?: string | undefined;
    connectionId?: string | undefined;
    creatorRole?: "buyer" | "seller" | undefined;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    dealAmountCents: number;
    feePayer: "buyer" | "seller" | "split";
    confirmLegal: true;
    terms?: string | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    itemDescription?: string | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
    tags?: string[] | undefined;
    preferredMiddlemanId?: string | undefined;
    connectionId?: string | undefined;
    creatorRole?: "buyer" | "seller" | undefined;
}>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
/**
 * Draft payload (Requirement 8.6). Every field is optional because a draft is a
 * half-set-up deal, and `.strict()` rejects unknown keys so the encrypted blob
 * cannot become a dumping ground for arbitrary counterparty PII before the
 * KeyProvider is wired.
 */
export declare const draftDataSchema: z.ZodObject<{
    coin: z.ZodOptional<z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>>;
    network: z.ZodOptional<z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>>;
    networkMode: z.ZodOptional<z.ZodEnum<["mainnet", "testnet"]>>;
    isPractice: z.ZodOptional<z.ZodBoolean>;
    productType: z.ZodOptional<z.ZodEnum<["digital", "account"]>>;
    dealAmountCents: z.ZodOptional<z.ZodNumber>;
    feePayer: z.ZodOptional<z.ZodEnum<["buyer", "seller", "split"]>>;
    feeSplitBuyerBps: z.ZodOptional<z.ZodNumber>;
    priceTolerancePct: z.ZodOptional<z.ZodNumber>;
    terms: z.ZodOptional<z.ZodString>;
    inspectionWindowDays: z.ZodOptional<z.ZodNumber>;
    templateId: z.ZodOptional<z.ZodString>;
    productId: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    terms?: string | undefined;
    coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
    network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    dealAmountCents?: number | undefined;
    feePayer?: "buyer" | "seller" | "split" | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
}, {
    terms?: string | undefined;
    coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
    network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
    networkMode?: "mainnet" | "testnet" | undefined;
    isPractice?: boolean | undefined;
    productType?: "digital" | "account" | undefined;
    dealAmountCents?: number | undefined;
    feePayer?: "buyer" | "seller" | "split" | undefined;
    feeSplitBuyerBps?: number | undefined;
    priceTolerancePct?: number | undefined;
    inspectionWindowDays?: number | undefined;
    templateId?: string | undefined;
    productId?: string | undefined;
}>;
export type DraftData = z.infer<typeof draftDataSchema>;
export declare const saveDraftSchema: z.ZodObject<{
    draftId: z.ZodOptional<z.ZodString>;
    lastStep: z.ZodString;
    data: z.ZodObject<{
        coin: z.ZodOptional<z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>>;
        network: z.ZodOptional<z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>>;
        networkMode: z.ZodOptional<z.ZodEnum<["mainnet", "testnet"]>>;
        isPractice: z.ZodOptional<z.ZodBoolean>;
        productType: z.ZodOptional<z.ZodEnum<["digital", "account"]>>;
        dealAmountCents: z.ZodOptional<z.ZodNumber>;
        feePayer: z.ZodOptional<z.ZodEnum<["buyer", "seller", "split"]>>;
        feeSplitBuyerBps: z.ZodOptional<z.ZodNumber>;
        priceTolerancePct: z.ZodOptional<z.ZodNumber>;
        terms: z.ZodOptional<z.ZodString>;
        inspectionWindowDays: z.ZodOptional<z.ZodNumber>;
        templateId: z.ZodOptional<z.ZodString>;
        productId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        terms?: string | undefined;
        coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
        network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
        networkMode?: "mainnet" | "testnet" | undefined;
        isPractice?: boolean | undefined;
        productType?: "digital" | "account" | undefined;
        dealAmountCents?: number | undefined;
        feePayer?: "buyer" | "seller" | "split" | undefined;
        feeSplitBuyerBps?: number | undefined;
        priceTolerancePct?: number | undefined;
        inspectionWindowDays?: number | undefined;
        templateId?: string | undefined;
        productId?: string | undefined;
    }, {
        terms?: string | undefined;
        coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
        network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
        networkMode?: "mainnet" | "testnet" | undefined;
        isPractice?: boolean | undefined;
        productType?: "digital" | "account" | undefined;
        dealAmountCents?: number | undefined;
        feePayer?: "buyer" | "seller" | "split" | undefined;
        feeSplitBuyerBps?: number | undefined;
        priceTolerancePct?: number | undefined;
        inspectionWindowDays?: number | undefined;
        templateId?: string | undefined;
        productId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    data: {
        terms?: string | undefined;
        coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
        network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
        networkMode?: "mainnet" | "testnet" | undefined;
        isPractice?: boolean | undefined;
        productType?: "digital" | "account" | undefined;
        dealAmountCents?: number | undefined;
        feePayer?: "buyer" | "seller" | "split" | undefined;
        feeSplitBuyerBps?: number | undefined;
        priceTolerancePct?: number | undefined;
        inspectionWindowDays?: number | undefined;
        templateId?: string | undefined;
        productId?: string | undefined;
    };
    lastStep: string;
    draftId?: string | undefined;
}, {
    data: {
        terms?: string | undefined;
        coin?: "USDT" | "SOL" | "BNB" | "ETH" | "TRX" | undefined;
        network?: "BNB" | "ETH" | "TRON" | "SOLANA" | undefined;
        networkMode?: "mainnet" | "testnet" | undefined;
        isPractice?: boolean | undefined;
        productType?: "digital" | "account" | undefined;
        dealAmountCents?: number | undefined;
        feePayer?: "buyer" | "seller" | "split" | undefined;
        feeSplitBuyerBps?: number | undefined;
        priceTolerancePct?: number | undefined;
        inspectionWindowDays?: number | undefined;
        templateId?: string | undefined;
        productId?: string | undefined;
    };
    lastStep: string;
    draftId?: string | undefined;
}>;
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;
export declare const dealIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const draftIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const updateTagsSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    tags: string[];
}, {
    tags: string[];
}>;
export type UpdateTagsInput = z.infer<typeof updateTagsSchema>;
/**
 * Schema for the middleman-only deal update endpoint.
 * All fields are optional — only provided fields are applied.
 */
export declare const middlemanUpdateDealSchema: z.ZodObject<{
    dealAmountCents: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    terms: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    statusOverride: z.ZodNullable<z.ZodOptional<z.ZodEnum<["Cancelled", "Disputed", "Released", "Refunded"]>>>;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    terms?: string | null | undefined;
    dealAmountCents?: number | null | undefined;
    statusOverride?: "Cancelled" | "Released" | "Disputed" | "Refunded" | null | undefined;
    note?: string | null | undefined;
}, {
    terms?: string | null | undefined;
    dealAmountCents?: number | null | undefined;
    statusOverride?: "Cancelled" | "Released" | "Disputed" | "Refunded" | null | undefined;
    note?: string | null | undefined;
}>;
export type MiddlemanUpdateDealInput = z.infer<typeof middlemanUpdateDealSchema>;
//# sourceMappingURL=deal.schemas.d.ts.map