import { z } from 'zod';
/**
 * Minimal shared Zod schemas. These are intended to be shared between client
 * and server so both validate identically (design: Frontend/API). Domain
 * schemas are added in later tasks.
 */
export declare const coinSchema: z.ZodEnum<["USDT", "SOL", "BNB", "ETH", "TRX"]>;
export declare const networkSchema: z.ZodEnum<["ETH", "BNB", "TRON", "SOLANA"]>;
/** Standard API error envelope (Requirement 44.4). */
export declare const errorEnvelopeSchema: z.ZodObject<{
    error_code: z.ZodString;
    message: z.ZodString;
    request_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error_code: string;
    message: string;
    request_id: string;
}, {
    error_code: string;
    message: string;
    request_id: string;
}>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
//# sourceMappingURL=schemas.d.ts.map