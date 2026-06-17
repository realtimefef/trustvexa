import { type DisputeOutcome } from './dispute-resolution.js';
import type { DisputeCategory } from './dispute.schemas.js';
type Role = 'buyer' | 'seller' | 'middleman';
export interface DisputeEvidenceView {
    id: string;
    fileHash: string;
    mimeType: string;
    reviewStatus: string;
    locked: boolean;
    createdAt: string | null;
}
export interface DisputeThreadView {
    id: string;
    status: string;
    locked: boolean;
    createdAt: string | null;
}
export interface DisputeView {
    role: Role;
    id: string;
    dealId: string;
    reason: string | null;
    status: string;
    resolution: string | null;
    decisionNote: string | null;
    resolvedAt: string | null;
    createdAt: string | null;
    evidence: DisputeEvidenceView[];
    threads: DisputeThreadView[];
}
export declare function getDisputeForUser(userId: string, dealId: string): Promise<DisputeView>;
export interface ResolveDisputeInput {
    middlemanId: string;
    dealId: string;
    idempotencyKey: string;
    outcome: DisputeOutcome;
    reason: string;
    buyerShareSmallestUnit?: string;
}
export interface ResolveDisputeResult {
    outcome: DisputeOutcome;
    toState: string;
    toBuyerSmallestUnit: string;
    toSellerSmallestUnit: string;
    decisionDocumentNumber: string;
}
/**
 * Resolve a deal's open dispute as the assigned middleman. Runs through the
 * money-write contract so it is idempotent (Idempotency-Key), optimistically
 * locked (deal version), and atomic: the settlement record, the dispute
 * resolution, the thread lock, and the deal-state transition all commit
 * together. The exact split is computed by the pure, tested settlement math and
 * always balances (toBuyer + toSeller === escrow). (Requirements 24.1-24.7)
 */
export declare function resolveDisputeForMiddleman(input: ResolveDisputeInput): Promise<ResolveDisputeResult>;
export interface OpenDisputeInput {
    userId: string;
    dealId: string;
    idempotencyKey: string;
    requestId: string;
    category: DisputeCategory;
    statement?: string;
}
export interface OpenDisputeResult {
    disputeId: string;
    dealId: string;
    threadId: string;
    category: DisputeCategory;
    fromState: string;
    toState: string;
}
/**
 * Open a dispute on a Funded or Delivered deal as one of its parties
 * (buyer/seller). Runs through the money-write contract so it is idempotent
 * (Idempotency-Key) and atomic: the `ProblemRaised` escrow transition (with its
 * optimistic-lock version bump and hash-chained `escrow_logs` audit row), the
 * `disputes` row, and the initial open `dispute_threads` row all commit
 * together. The transition is decided by the same server-authoritative state
 * machine as every other escrow change, so opening from any state other than
 * Funded/Delivered is rejected. (Requirement 24.1)
 */
export declare function openDisputeForParty(input: OpenDisputeInput): Promise<OpenDisputeResult>;
export interface DisputeMessageView {
    id: string;
    threadId: string;
    senderId: string | null;
    role: string | null;
    body: string | null;
    createdAt: string | null;
}
/**
 * List a dispute's thread messages for a caller who is a party to the deal
 * (buyer/seller) or the assigned middleman. Non-parties get the same opaque 404
 * as a missing dispute. (Requirement 24.2)
 */
export declare function listDisputeMessagesForUser(userId: string, disputeId: string): Promise<{
    disputeId: string;
    role: Role;
    messages: DisputeMessageView[];
}>;
export interface PostDisputeMessageInput {
    userId: string;
    disputeId: string;
    idempotencyKey: string;
    body: string;
}
export interface PostDisputeMessageResult {
    messageId: string;
    disputeId: string;
    role: Role;
}
/**
 * Post a statement to a dispute thread as a party or the assigned middleman.
 * Idempotent via the money-write contract; the insert is gated on the thread
 * still being `open`, so once a dispute resolves (threads locked) no further
 * statements are accepted. (Requirement 24.2)
 */
export declare function postDisputeMessageForUser(input: PostDisputeMessageInput): Promise<PostDisputeMessageResult>;
export interface RegisterEvidenceInput {
    userId: string;
    disputeId: string;
    idempotencyKey: string;
    fileKey: string;
    fileHash: string;
    mimeType: string;
}
export interface RegisterEvidenceResult {
    evidenceId: string;
    disputeId: string;
    fileHash: string;
    mimeType: string;
    locked: boolean;
}
/**
 * Register an evidence record for a dispute. Evidence is hashed and locked at
 * upload (`locked_at`), so the row is immutable once created. Idempotent via
 * the money-write contract. (Requirement 24.3)
 */
export declare function registerDisputeEvidenceForUser(input: RegisterEvidenceInput): Promise<RegisterEvidenceResult>;
export {};
//# sourceMappingURL=dispute.service.d.ts.map