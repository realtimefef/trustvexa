// Shared client-side types for API responses. Field casing mirrors the API
// envelopes (snake_case on the wire) so the client never silently renames data.

/**
 * Public user shape returned by auth endpoints (`toPublicUser`). The API emits
 * camelCase here (`accountStatus` / `accountLabel`), so the client field names
 * must match exactly — snake_case aliases would always read `undefined`.
 * (Re-audit FIX — API contract mismatch)
 */
export interface PublicUser {
  id: string;
  username: string;
  role: 'user' | 'middleman';
  accountStatus?: string;
  accountLabel?: string | null;
  totpEnabled?: boolean;
  [key: string]: unknown;
}

/** Successful auth response body (login / register / refresh). */
export interface AuthResponse {
  user: PublicUser;
  access_token: string;
  access_expires_at: string;
}

/** Standard API error envelope. */
export interface ApiErrorBody {
  error_code?: string;
  message?: string;
  request_id?: string;
}

/** A saved deal draft as returned by `GET /deals/drafts`. */
export interface DealDraft {
  id: string;
  last_step?: string;
  updated_at?: string;
  created_at?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Dashboard + deal-detail read models
// (GET /dashboard, GET /dashboard/deals/:id). These mirror the camelCase DTOs
// returned by the dashboard service; money fields are integer-cent strings
// passed through verbatim so no precision is lost in the browser.
// ---------------------------------------------------------------------------

/** Which party the signed-in user is for a given deal. */
export type DealRole = 'buyer' | 'seller' | 'middleman';

/** A prioritized "what to do next" item for the user's role + deal status. */
export interface NextAction {
  code: string;
  label: string;
  blocking: boolean;
}

/** One entry in a deal's activity timeline. */
export interface TimelineEntry {
  at: string;
  code: string;
  actorRole: DealRole | 'system';
}

/** A deal as shown on the dashboard list. */
export interface DealSummary {
  id: string;
  role: DealRole;
  status: string;
  coin: string;
  network: string;
  networkMode: string;
  isPractice: boolean;
  dealAmountCents: string | null;
  amountCoin: string | null;
  feePayer: string | null;
  /** Buyer's share of platform fee in basis points (0-10000). Null when feePayer != 'split'. */
  feeSplitBuyerBps: number | null;
  buyerTotalCents: string | null;
  sellerPayoutCents: string | null;
  holdStatus: string | null;
  riskScore: number | null;
  fundBy: string | null;
  completeBy: string | null;
  inspectionUntil: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  nextActions: NextAction[];
  waitingOnYou: boolean;
  tags?: string[];
  /** Short label for the deal item, shown as title. */
  itemDescription: string | null;
}

/** Full deal-detail view: summary + extra money/meta fields + timeline. */
export interface DealDetail extends DealSummary {
  amountSmallestUnit: string | null;
  lockedFxRate: string | null;
  fxSource: string | null;
  priceTolerancePct: string | null;
  platformFeeCents: string | null;
  sellerSettlementFeeCents: string | null;
  transactionFeeCents: string | null;
  legalHold: boolean;
  attemptNo: number;
  versionNo: number;
  timeline: TimelineEntry[];
  /** Set when the deal has a confirmed buyer already (e.g. created from a connection). */
  buyerId?: string | null;
  sellerId?: string | null;
  /** The assigned middleman's user ID — null when no middleman has been added yet.
   * Used by the UI to hide the "Add middleman" button when one is already assigned. */
  middlemanId?: string | null;
  /** Agreement progress — used to show "you already agreed" on page reload
   * even before the other party agrees (status stays Created/Invited). */
  lockedAt?: string | null;
  buyerAgreedAt?: string | null;
  sellerAgreedAt?: string | null;
  /** The connection (chat) this deal was created from. */
  connectionId?: string | null;
  connectionCode?: string | null;
}

/** Response body of GET /dashboard. */
export interface DashboardResponse {
  deals: DealSummary[];
}

// ---------------------------------------------------------------------------
// Middleman/admin console read models (GET /admin/queue, /admin/disputes).
// ---------------------------------------------------------------------------

/** A deal in the middleman's work queue. */
export interface QueueItem {
  id: string;
  status: string;
  riskScore: number | null;
  dealAmountCents: string | null;
  coin: string;
  network: string;
  isPractice: boolean;
  holdStatus: string | null;
  lastActivityAt: string | null;
  fundBy: string | null;
  completeBy: string | null;
  nextActions: NextAction[];
  waitingOnMiddleman: boolean;
}

/** Roll-up counts shown atop the middleman queue. */
export interface QueueSummary {
  total: number;
  waiting: number;
  onHold: number;
}

/** Response body of GET /admin/queue. */
export interface MiddlemanQueueResponse {
  items: QueueItem[];
  summary: QueueSummary;
}

/** An open dispute on one of the middleman's deals. */
export interface AdminDispute {
  id: string;
  dealId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  dealStatus: string;
  coin: string;
  network: string;
}

/** Response body of GET /admin/disputes. */
export interface AdminDisputesResponse {
  disputes: AdminDispute[];
}

// ---------------------------------------------------------------------------
// Public contact form (POST /contact) and cookie consent (POST /consent/cookie).
// ---------------------------------------------------------------------------

/** Request body for POST /contact. */
export interface ContactRequest {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

/** Response body of POST /contact. */
export interface ContactResponse {
  id: string;
  status: string;
  created_at: string;
}

/** Cookie-consent categories. Essential is always on. */
export interface ConsentChoices {
  essential: true;
  functional: boolean;
  analytics: boolean;
}

/** Request body for POST /consent/cookie. */
export interface CookieConsentRequest {
  visitorId?: string;
  choices: ConsentChoices;
}

/** Response body of POST /consent/cookie. */
export interface CookieConsentResponse {
  id: string;
  consented_at: string;
}

// ---------------------------------------------------------------------------
// Treasury, disputes, reviews, documents, handover, onboarding, risk & public
// read models (tasks 7.2-7.8, 8.2, 9.4)

export interface TreasuryLine {
  coin: string;
  network: string;
  heldInEscrow: string;
  owedToSellers: string;
  refundsOwed: string;
  platformFeeRevenue: string;
  gasSpent: string;
  hotBalance: string;
  coldBalance: string;
  ledgerBalance: string;
  onchainBalance: string;
  deltaSmallestUnit: string;
  reconciled: boolean;
  mismatch: boolean;
  snapshotAt: string;
}

export interface TreasuryResponse {
  lines: TreasuryLine[];
  mismatchCount: number;
}

export interface PolicyVersion {
  docType: string;
  version: number;
  summary: string | null;
  contentHash: string | null;
  publishedAt: string | null;
}

export interface PolicyVersionsResponse {
  versions: PolicyVersion[];
}

export interface OnboardingTaskView {
  key: string;
  title: string;
  required: boolean;
  done: boolean;
}

export interface OnboardingResponse {
  tasks: OnboardingTaskView[];
  progress: { completed: number; total: number; percent: number; remaining: string[] };
  complete: boolean;
}

export interface TrustRestriction {
  kind: string;
  missedDeadlineCount: number;
  blockNewDeals: boolean;
  maxActiveDeals: number | null;
  cooldownHours: number | null;
  temporaryBlockDays: number | null;
  requiresMiddlemanReinstate: boolean;
}

export interface TrustStatusResponse {
  missedDeadlineCount: number;
  restriction: TrustRestriction;
}

export interface PublicReview {
  id: string;
  dealId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface UserReviewsResponse {
  revieweeId: string;
  count: number;
  averageRating: number;
  reviews: PublicReview[];
}

/** A review row in the middleman moderation view (includes hidden ones). */
export interface ModerationReview {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface ReviewModerationResponse {
  revieweeId: string;
  reviews: ModerationReview[];
}

/** Result of hiding/unhiding a review. */
export interface ModerateReviewResponse {
  reviewId: string;
  hidden: boolean;
  auditId: string;
}

export interface DocumentEntry {
  kind: string;
  label: string;
  permitted: boolean;
  ready: boolean;
}

export interface DealDocumentsResponse {
  dealId: string;
  role: 'buyer' | 'seller' | 'middleman';
  documents: DocumentEntry[];
}

export interface HandoverItemView {
  id: string;
  itemType: string;
  verificationStatus: string;
  revealStatus: string;
  revealedToBuyer: boolean;
  transferredAt: string | null;
  createdAt: string | null;
}

export interface HandoverResponse {
  dealId: string;
  role: 'buyer' | 'seller' | 'middleman';
  items: HandoverItemView[];
}

export interface RiskFlagView {
  id: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string | null;
  createdAt: string;
}

export interface RiskPanelResponse {
  dealId: string;
  dealRiskScore: number | null;
  panel: { score: number; highestSeverity: string; flagCount: number };
  flags: RiskFlagView[];
}

// --- Dispute resolution (middleman) ---

/** Possible outcomes when a middleman resolves a dispute. */
export type DisputeOutcome = 'full_refund' | 'full_release' | 'partial_split';

/** Request body for resolving a dispute on a deal. */
export interface DisputeResolveRequest {
  outcome: DisputeOutcome;
  reason: string;
  /** Buyer's share in coin smallest units; required only for `partial_split`. */
  buyerShareSmallestUnit?: string;
}

/** Response after a dispute is resolved. */
export interface DisputeResolveResponse {
  outcome: DisputeOutcome;
  toState: string;
  toBuyerSmallestUnit: string;
  toSellerSmallestUnit: string;
  decisionDocumentNumber: string;
}

// --- Enforcement (middleman) ---

/** Account trust/limit labels applied by enforcement actions. */
export type AccountLabel =
  | 'new_user'
  | 'good_standing'
  | 'trusted'
  | 'high_risk'
  | 'middleman_verified';

/** Result of an enforcement action (block/unblock/label/trust-downgrade). */
export interface EnforcementResult {
  action: string;
  auditId: string;
}
