/**
 * Dispute request schemas (task 7.5). The resolve endpoint is middleman-only
 * and money-moving, so its body is strictly validated: a `partial_split`
 * requires a non-negative integer `buyerShareSmallestUnit` (sent as a decimal
 * string to avoid JSON number precision loss), while full refund/release must
 * not carry one.
 */
import { z } from 'zod';
/**
 * Dispute categories a party may open a dispute under (Requirement 24.1). The
 * chosen value is persisted as the dispute's `reason` (there is no dedicated
 * category column on `disputes`); the free-form narrative lives in the thread.
 */
export declare const DISPUTE_CATEGORIES: readonly ["item_not_delivered", "account_details_wrong", "buyer_not_responding", "seller_not_responding", "wrong_item", "payment_issue", "fraud_attempt"];
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];
/** `:disputeId` route param for the thread/evidence sub-routes. */
export declare const disputeIdParamSchema: z.ZodObject<{
    disputeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    disputeId: string;
}, {
    disputeId: string;
}>;
/**
 * Body for opening a dispute on a Funded/Delivered deal (Requirement 24.1). The
 * category is required; an optional opening statement seeds the first thread
 * message so the narrative starts with the dispute.
 */
export declare const openDisputeSchema: z.ZodObject<{
    category: z.ZodEnum<["item_not_delivered", "account_details_wrong", "buyer_not_responding", "seller_not_responding", "wrong_item", "payment_issue", "fraud_attempt"]>;
    statement: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    category: "item_not_delivered" | "account_details_wrong" | "buyer_not_responding" | "seller_not_responding" | "wrong_item" | "payment_issue" | "fraud_attempt";
    statement?: string | undefined;
}, {
    category: "item_not_delivered" | "account_details_wrong" | "buyer_not_responding" | "seller_not_responding" | "wrong_item" | "payment_issue" | "fraud_attempt";
    statement?: string | undefined;
}>;
export type OpenDisputeBody = z.infer<typeof openDisputeSchema>;
/**
 * Body for posting a statement to a dispute thread (Requirement 24.2). Stored
 * as-is in `body_enc` (plaintext for now; the column is named for the future
 * KeyProvider-encrypted blob, consistent with chat messages).
 */
export declare const postMessageSchema: z.ZodObject<{
    body: z.ZodString;
}, "strict", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export type PostMessageBody = z.infer<typeof postMessageSchema>;
/**
 * Body for registering an evidence record (Requirement 24.3). Only the storage
 * key, content hash, and MIME type are accepted; the row is hashed and locked
 * at upload, so it is immutable once created.
 */
export declare const registerEvidenceSchema: z.ZodObject<{
    fileKey: z.ZodString;
    fileHash: z.ZodString;
    mimeType: z.ZodString;
}, "strict", z.ZodTypeAny, {
    fileKey: string;
    fileHash: string;
    mimeType: string;
}, {
    fileKey: string;
    fileHash: string;
    mimeType: string;
}>;
export type RegisterEvidenceBody = z.infer<typeof registerEvidenceSchema>;
export declare const resolveDisputeSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    outcome: z.ZodEnum<["full_refund", "full_release", "partial_split"]>;
    reason: z.ZodString;
    buyerShareSmallestUnit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}>, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}>, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}, {
    reason: string;
    outcome: "full_refund" | "full_release" | "partial_split";
    buyerShareSmallestUnit?: string | undefined;
}>;
export type ResolveDisputeBody = z.infer<typeof resolveDisputeSchema>;
//# sourceMappingURL=dispute.schemas.d.ts.map