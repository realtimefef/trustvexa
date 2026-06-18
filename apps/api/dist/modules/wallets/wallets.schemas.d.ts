import { z } from 'zod';
/** `POST /wallets/address-book` body. */
export declare const addAddressSchema: z.ZodObject<{
    label: z.ZodString;
    coin: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
    network: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
    address: z.ZodString;
}, "strip", z.ZodTypeAny, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    label: string;
    address: string;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    label: string;
    address: string;
}>;
/** `DELETE /wallets/address-book/:id` path param. */
export declare const addressIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/** `POST /wallets/validate` body. */
export declare const validateAddressSchema: z.ZodObject<{
    coin: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
    network: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
    address: z.ZodString;
}, "strip", z.ZodTypeAny, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    address: string;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    address: string;
}>;
/** `POST /wallets/change-requests` body. */
export declare const changeRequestSchema: z.ZodObject<{
    walletType: z.ZodEnum<["refund", "payout"]>;
    coin: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
    network: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
    oldAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    newAddress: z.ZodString;
    dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    walletType: "refund" | "payout";
    newAddress: string;
    dealId?: string | null | undefined;
    oldAddress?: string | null | undefined;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    walletType: "refund" | "payout";
    newAddress: string;
    dealId?: string | null | undefined;
    oldAddress?: string | null | undefined;
}>;
export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
/** `POST /wallets/withdraw` body. */
export declare const withdrawSchema: z.ZodObject<{
    coin: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
    network: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
    amount: z.ZodEffects<z.ZodString, string, string>;
    address: z.ZodString;
}, "strip", z.ZodTypeAny, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    amount: string;
    address: string;
}, {
    coin: "USDT" | "SOL" | "BNB" | "ETH" | "TRX";
    network: "BNB" | "ETH" | "TRON" | "SOLANA";
    amount: string;
    address: string;
}>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
//# sourceMappingURL=wallets.schemas.d.ts.map