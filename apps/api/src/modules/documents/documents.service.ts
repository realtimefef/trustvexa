/**
 * Documents service (task 7.8). Lists the documents a caller may obtain for a
 * deal they are a party to, using the pure permission rules in `receipts.ts`.
 * The actual PDF/CSV bytes are produced by a later rendering step; until that
 * is wired, each permitted entry is reported with `ready: false` so the UI can
 * show availability without implying a download exists. (Requirements 37.1-37.4)
 */
import { query } from '@trustvexa/shared';
import { randomUUID } from 'node:crypto';
import { getObjectStorage, documentKey } from '../storage/object-storage.js';

import { AppError, notFound } from '../../errors/app-error.js';
import {
  buildLockedAgreement,
  generateDocumentNumber,
  renderAgreementText,
} from '../deal/agreement.js';
import { canDownloadDocument, type DocumentKind } from './receipts.js';
import { renderPdf } from './pdf.js';
import { getDealAccess, type DealDocAccessRow } from './documents-read.repository.js';

type Role = 'buyer' | 'seller' | 'middleman';

function roleForUser(deal: DealDocAccessRow, userId: string): Role | null {
  if (deal.buyer_id === userId) return 'buyer';
  if (deal.seller_id === userId) return 'seller';
  if (deal.middleman_id === userId) return 'middleman';
  return null;
}

const CATALOG: ReadonlyArray<{ kind: DocumentKind; label: string }> = [
  { kind: 'deal_agreement', label: 'Deal agreement' },
  { kind: 'dispute_decision', label: 'Dispute decision' },
  { kind: 'invoice', label: 'Invoice' },
  { kind: 'receipt', label: 'Receipt' },
  { kind: 'activity_timeline', label: 'Activity timeline' },
  { kind: 'data_export', label: 'Data export' },
];

export interface DocumentEntry {
  kind: DocumentKind;
  label: string;
  /** True when this role may download the document for this deal. */
  permitted: boolean;
  /** True once the rendered file exists; false until rendering is wired. */
  ready: boolean;
}

export interface DealDocuments {
  dealId: string;
  role: Role;
  documents: DocumentEntry[];
}

export async function listDealDocuments(userId: string, dealId: string): Promise<DealDocuments> {
  const access = await getDealAccess(dealId);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Deal was not found.');
  }
  const isMiddleman = role === 'middleman';
  const isParty = role === 'buyer' || role === 'seller';

  const { rows } = await query<{ document_type: string; file_key: string }>(
    `SELECT document_type, file_key FROM deal_documents WHERE deal_id = $1`,
    [dealId],
  );
  const docMap = new Map(rows.map((r) => [r.document_type, r.file_key]));

  const documents = CATALOG.map(({ kind, label }) => {
    let dbType: string = kind;
    if (kind === 'deal_agreement') dbType = 'agreement';
    const isReady = docMap.has(dbType) && !!docMap.get(dbType);
    return {
      kind,
      label,
      permitted: canDownloadDocument(kind, isParty, isMiddleman),
      ready: isReady,
    };
  });
  return { dealId, role, documents };
}

interface DealAgreementRow {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  product_id: string | null;
  coin: string;
  network: string;
  deal_amount: string | null;
  platform_fee: string | null;
  seller_settlement_fee: string | null;
  transaction_fee: string | null;
  buyer_total: string | null;
  seller_payout: string | null;
  fee_payer: string | null;
  inspection_until: string | null;
  complete_by: string | null;
  fund_by: string | null;
  status: string;
}

/**
 * Build the deal-agreement PDF bytes on the fly for a caller who is a party to
 * the deal (or the assigned middleman). Deterministic: the same deal produces
 * the same document. Returns the PDF buffer and its stable document number.
 */
async function buildAgreementPdfRaw(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const access = await getDealAccess(dealId);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Deal was not found.');
  }

  const { rows } = await query<DealAgreementRow>(
    `SELECT id, buyer_id, seller_id, middleman_id, product_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer,
            inspection_until::text AS inspection_until,
            complete_by::text AS complete_by,
            fund_by::text AS fund_by,
            status
       FROM deals WHERE id = $1`,
    [dealId],
  );
  const deal = rows[0];
  if (!deal) {
    throw notFound('Deal was not found.');
  }

  const termsRes = await query<{ version: number }>(
    `SELECT version FROM deal_terms WHERE deal_id = $1 ORDER BY version DESC LIMIT 1`,
    [dealId],
  );
  const termsVersion = termsRes.rows[0] ? `v${termsRes.rows[0].version}` : 'v1';

  const agreement = buildLockedAgreement(
    {
      id: deal.id,
      buyerId: deal.buyer_id,
      sellerId: deal.seller_id,
      middlemanId: deal.middleman_id,
      productId: deal.product_id,
      coin: deal.coin,
      network: deal.network,
      dealAmount: deal.deal_amount,
      platformFee: deal.platform_fee,
      sellerSettlementFee: deal.seller_settlement_fee,
      transactionFee: deal.transaction_fee,
      buyerTotal: deal.buyer_total,
      sellerPayout: deal.seller_payout,
      feePayer: deal.fee_payer,
      inspectionUntil: deal.inspection_until,
      completeBy: deal.complete_by,
      fundBy: deal.fund_by,
      status: deal.status,
    },
    termsVersion,
  );

  const documentNumber = generateDocumentNumber(dealId);
  // renderAgreementText's first line is the heading; the PDF supplies its own
  // title, so drop the duplicate first line.
  const lines = renderAgreementText(agreement).split('\n').slice(1);
  const buffer = renderPdf({ title: 'TrustVexa Deal Agreement', lines });
  return { buffer, documentNumber };
}

export async function buildAgreementPdf(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  return getOrBuildDocument(dealId, 'agreement', () => buildAgreementPdfRaw(userId, dealId));
}

// Deal states for which a completed-deal receipt is meaningful.
const RECEIPT_STATES = new Set(['Released', 'Refunded', 'PartiallySettled']);

interface ReceiptDealRow {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  coin: string;
  network: string;
  deal_amount: string | null;
  platform_fee: string | null;
  seller_settlement_fee: string | null;
  transaction_fee: string | null;
  buyer_total: string | null;
  seller_payout: string | null;
  fee_payer: string | null;
  status: string;
  updated_at: string | null;
}

function money(value: string | null): string {
  return value === null || value === '' ? '—' : value;
}

/**
 * Build the branded receipt PDF for a completed deal (Released / Refunded /
 * PartiallySettled). Deterministic and only available to a party of the deal or
 * the assigned middleman. (Requirement 37.1)
 */
async function buildReceiptPdfRaw(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const access = await getDealAccess(dealId);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Deal was not found.');
  }

  const { rows } = await query<ReceiptDealRow>(
    `SELECT id, buyer_id, seller_id, middleman_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer, status,
            updated_at::text AS updated_at
       FROM deals WHERE id = $1`,
    [dealId],
  );
  const deal = rows[0];
  if (!deal) throw notFound('Deal was not found.');
  if (!RECEIPT_STATES.has(deal.status)) {
    throw new AppError(
      'receipt_unavailable',
      'A receipt is available only after the deal is settled.',
      409,
    );
  }

  const documentNumber = generateDocumentNumber(dealId);
  const lines = [
    `Receipt number: ${documentNumber}`,
    `Deal ID: ${deal.id}`,
    `Status: ${deal.status}`,
    `Coin / network: ${deal.coin} (${deal.network})`,
    `Fee payer: ${deal.fee_payer ?? '—'}`,
    '',
    `Deal amount: ${money(deal.deal_amount)}`,
    `Platform fee: ${money(deal.platform_fee)}`,
    `Settlement fee (0.5%): ${money(deal.seller_settlement_fee)}`,
    `Network (gas) fee: ${money(deal.transaction_fee)}`,
    `Buyer sent: ${money(deal.buyer_total)}`,
    `Seller received: ${money(deal.seller_payout)}`,
    '',
    `Settled at: ${deal.updated_at ?? '—'}`,
    'All amounts are denominated in the deal coin (smallest units).',
  ];
  const buffer = renderPdf({ title: 'TrustVexa Receipt', lines });
  return { buffer, documentNumber };
}

export async function buildReceiptPdf(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  return getOrBuildDocument(dealId, 'receipt', () => buildReceiptPdfRaw(userId, dealId));
}

interface DisputeDecisionRow {
  dispute_id: string;
  reason: string | null;
  resolution: string | null;
  final_decision_note: string | null;
  resolved_at: string | null;
  buyer_refund_amount: string | null;
  seller_release_amount: string | null;
  settlement_type: string | null;
}

/**
 * Build the final dispute-decision PDF for a deal whose dispute has been
 * resolved. Available to a party of the deal or the assigned middleman; throws
 * if no resolved dispute exists. (Requirement 24.6)
 */
async function buildDisputeDecisionPdfRaw(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const access = await getDealAccess(dealId);
  const role = access ? roleForUser(access, userId) : null;
  if (!access || role === null) {
    throw notFound('Deal was not found.');
  }

  const { rows } = await query<DisputeDecisionRow>(
    `SELECT d.id AS dispute_id, d.reason, d.resolution, d.final_decision_note,
            d.resolved_at::text AS resolved_at,
            s.buyer_refund_amount, s.seller_release_amount, s.type AS settlement_type
       FROM disputes d
       LEFT JOIN settlements s ON s.deal_id = d.deal_id
      WHERE d.deal_id = $1 AND d.status = 'resolved'
      ORDER BY d.resolved_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1`,
    [dealId],
  );
  const row = rows[0];
  if (!row || row.resolution === null) {
    throw new AppError(
      'decision_unavailable',
      'A decision document is available only after the dispute is resolved.',
      409,
    );
  }

  const documentNumber = generateDocumentNumber(dealId);
  const lines = [
    `Decision number: ${documentNumber}`,
    `Deal ID: ${dealId}`,
    `Dispute ID: ${row.dispute_id}`,
    `Outcome: ${(row.settlement_type ?? row.resolution).replace(/_/gu, ' ')}`,
    '',
    `Reason raised: ${row.reason ?? '—'}`,
    `Decision note: ${row.final_decision_note ?? '—'}`,
    '',
    `Refunded to buyer: ${money(row.buyer_refund_amount)}`,
    `Released to seller: ${money(row.seller_release_amount)}`,
    `Resolved at: ${row.resolved_at ?? '—'}`,
    'Amounts are in the deal coin (smallest units). This decision is final and audited.',
  ];
  const buffer = renderPdf({ title: 'TrustVexa Dispute Decision', lines });
  return { buffer, documentNumber };
}

export async function buildDisputeDecisionPdf(
  userId: string,
  dealId: string,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  return getOrBuildDocument(dealId, 'dispute_decision', () =>
    buildDisputeDecisionPdfRaw(userId, dealId),
  );
}

export interface UserDataExport {
  generatedAt: string;
  profile: {
    id: string;
    username: string;
    accountLabel: string | null;
    trustLevel: number | null;
    createdAt: string | null;
  } | null;
  deals: Array<{
    id: string;
    role: 'buyer' | 'seller';
    coin: string;
    network: string;
    dealAmount: string | null;
    status: string;
    createdAt: string | null;
  }>;
  reviewsGiven: Array<{
    dealId: string;
    rating: number;
    comment: string | null;
    createdAt: string | null;
  }>;
}

/**
 * Build the caller's own data export (profile, their deals, and the reviews
 * they have written), never exposing another user's private info. Returns a
 * plain JSON-serializable object the controller streams as a download.
 * (Requirement 37.3)
 */
export async function buildDataExport(userId: string): Promise<UserDataExport> {
  const profileRes = await query<{
    id: string;
    username: string;
    account_label: string | null;
    trust_level: number | null;
    created_at: string | null;
  }>(
    `SELECT id, username, account_label, trust_level, created_at::text AS created_at
       FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  const p = profileRes.rows[0] ?? null;

  const dealsRes = await query<{
    id: string;
    buyer_id: string | null;
    seller_id: string | null;
    coin: string;
    network: string;
    deal_amount: string | null;
    status: string;
    created_at: string | null;
  }>(
    `SELECT id, buyer_id, seller_id, coin, network, deal_amount, status,
            created_at::text AS created_at
       FROM deals WHERE buyer_id = $1 OR seller_id = $1
      ORDER BY created_at DESC LIMIT 500`,
    [userId],
  );

  const reviewsRes = await query<{
    deal_id: string;
    rating: number;
    comment: string | null;
    created_at: string | null;
  }>(
    `SELECT deal_id, rating, comment, created_at::text AS created_at
       FROM reviews WHERE reviewer_id = $1
      ORDER BY created_at DESC LIMIT 500`,
    [userId],
  );

  return {
    generatedAt: new Date().toISOString(),
    profile: p
      ? {
          id: p.id,
          username: p.username,
          accountLabel: p.account_label,
          trustLevel: p.trust_level,
          createdAt: p.created_at,
        }
      : null,
    deals: dealsRes.rows.map((d) => ({
      id: d.id,
      role: d.buyer_id === userId ? ('buyer' as const) : ('seller' as const),
      coin: d.coin,
      network: d.network,
      dealAmount: d.deal_amount,
      status: d.status,
      createdAt: d.created_at,
    })),
    reviewsGiven: reviewsRes.rows.map((r) => ({
      dealId: r.deal_id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  };
}

async function getOrBuildDocument(
  dealId: string,
  docType: 'agreement' | 'receipt' | 'dispute_decision',
  buildFn: () => Promise<{ buffer: Buffer; documentNumber: string }>,
): Promise<{ buffer: Buffer; documentNumber: string }> {
  // 1. Check if database row exists
  const { rows } = await query<{ document_number: string; file_key: string }>(
    `SELECT document_number, file_key FROM deal_documents WHERE deal_id = $1 AND document_type = $2 LIMIT 1`,
    [dealId, docType],
  );

  const existing = rows[0];
  const storage = getObjectStorage();

  if (existing?.file_key) {
    const bytes = await storage.get(existing.file_key);
    if (bytes) {
      return { buffer: bytes, documentNumber: existing.document_number };
    }
  }

  // 2. Otherwise build it
  const { buffer, documentNumber } = await buildFn();

  // 3. Upload to storage
  const docId = randomUUID();
  const key = documentKey(dealId, docType, docId);
  await storage.put(key, buffer, 'application/pdf');

  // 4. Save to database
  if (existing) {
    await query(
      `UPDATE deal_documents SET file_key = $1, created_at = now() WHERE deal_id = $2 AND document_type = $3`,
      [key, dealId, docType],
    );
  } else {
    await query(
      `INSERT INTO deal_documents (deal_id, document_type, document_number, file_key, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [dealId, docType, documentNumber, key],
    );
  }

  return { buffer, documentNumber };
}
