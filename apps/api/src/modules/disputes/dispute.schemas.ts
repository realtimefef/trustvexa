/**
 * Dispute request schemas (task 7.5). The resolve endpoint is middleman-only
 * and money-moving, so its body is strictly validated: a `partial_split`
 * requires a non-negative integer `buyerShareSmallestUnit` (sent as a decimal
 * string to avoid JSON number precision loss), while full refund/release must
 * not carry one.
 */
import { z } from 'zod';

const smallestUnitString = z.string().regex(/^\d+$/u, 'must be a non-negative integer string');

/**
 * Dispute categories a party may open a dispute under (Requirement 24.1). The
 * chosen value is persisted as the dispute's `reason` (there is no dedicated
 * category column on `disputes`); the free-form narrative lives in the thread.
 */
export const DISPUTE_CATEGORIES = [
  'item_not_delivered',
  'account_details_wrong',
  'buyer_not_responding',
  'seller_not_responding',
  'wrong_item',
  'payment_issue',
  'fraud_attempt',
] as const;

export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];

/** `:disputeId` route param for the thread/evidence sub-routes. */
export const disputeIdParamSchema = z.object({ disputeId: z.string().uuid() });

/**
 * Body for opening a dispute on a Funded/Delivered deal (Requirement 24.1). The
 * category is required; an optional opening statement seeds the first thread
 * message so the narrative starts with the dispute.
 */
export const openDisputeSchema = z
  .object({
    category: z.enum(DISPUTE_CATEGORIES),
    statement: z.string().trim().min(1).max(5_000).optional(),
  })
  .strict();
export type OpenDisputeBody = z.infer<typeof openDisputeSchema>;

/**
 * Body for posting a statement to a dispute thread (Requirement 24.2). Stored
 * as-is in `body_enc` (plaintext for now; the column is named for the future
 * KeyProvider-encrypted blob, consistent with chat messages).
 */
export const postMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(5_000),
  })
  .strict();
export type PostMessageBody = z.infer<typeof postMessageSchema>;

/**
 * Body for registering an evidence record (Requirement 24.3). Only the storage
 * key, content hash, and MIME type are accepted; the row is hashed and locked
 * at upload, so it is immutable once created.
 */
export const registerEvidenceSchema = z
  .object({
    fileKey: z.string().trim().min(1).max(1_024),
    fileHash: z.string().trim().min(1).max(128),
    mimeType: z.string().trim().min(1).max(255),
  })
  .strict();
export type RegisterEvidenceBody = z.infer<typeof registerEvidenceSchema>;

export const resolveDisputeSchema = z
  .object({
    outcome: z.enum(['full_refund', 'full_release', 'partial_split']),
    reason: z.string().trim().min(1).max(2000),
    buyerShareSmallestUnit: smallestUnitString.optional(),
  })
  .refine((v) => (v.outcome === 'partial_split' ? v.buyerShareSmallestUnit !== undefined : true), {
    message: 'buyerShareSmallestUnit is required for partial_split',
    path: ['buyerShareSmallestUnit'],
  })
  .refine((v) => (v.outcome !== 'partial_split' ? v.buyerShareSmallestUnit === undefined : true), {
    message: 'buyerShareSmallestUnit is only valid for partial_split',
    path: ['buyerShareSmallestUnit'],
  });

export type ResolveDisputeBody = z.infer<typeof resolveDisputeSchema>;
