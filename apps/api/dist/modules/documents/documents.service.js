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
import { generateDocumentNumber, } from '../deal/agreement.js';
import { canDownloadDocument } from './receipts.js';
import { renderPdf } from './pdf.js';
import { computeFeeBreakdown } from '../money/fee-engine.js';
import { getDealAccess } from './documents-read.repository.js';
/** Bumped whenever the PDF layout changes so cached documents are regenerated. */
const PDF_DESIGN_VERSION = 'v3';
/** Format a USD-cents string as "$1,234.56" (deal money columns are cents). */
function usd(cents) {
    if (cents === null || cents === '')
        return '—';
    const n = Number(cents);
    if (!Number.isFinite(n))
        return '—';
    return `$${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/**
 * Representative network (gas) cost in USD cents per chain — mirrors the web
 * fee calculator. The real gas is locked server-side at funding; this is the
 * same estimate the app shows when the deal's locked fee columns are empty.
 */
const NETWORK_GAS_CENTS = {
    SOLANA: 0n,
    BNB: 15n,
    TRON: 100n,
    ETH: 500n,
};
/**
 * Resolve a deal's money figures for a document. When the authoritative locked
 * columns are present they are used as-is; otherwise the canonical fee engine
 * computes the breakdown from the deal amount + fee payer + split + a network
 * gas estimate, so documents are always fully filled in (never blank "—") and
 * match the in-app fee breakdown to the cent (excluding live gas).
 */
function resolveDealMoney(d) {
    const base = {
        dealAmount: d.deal_amount,
        platformFee: d.platform_fee,
        settlementFee: d.seller_settlement_fee,
        gasFee: d.transaction_fee,
        buyerTotal: d.buyer_total,
        sellerPayout: d.seller_payout,
        feePayer: d.fee_payer,
    };
    // If the locked totals are already present, trust them.
    if (d.buyer_total !== null && d.seller_payout !== null && d.platform_fee !== null) {
        return base;
    }
    if (!d.deal_amount)
        return base;
    try {
        const feePayer = d.fee_payer === 'buyer' || d.fee_payer === 'seller' || d.fee_payer === 'split'
            ? d.fee_payer
            : 'split';
        const gas = NETWORK_GAS_CENTS[d.network] ?? 0n;
        const split = d.fee_split_buyer_bps != null ? BigInt(d.fee_split_buyer_bps) : undefined;
        const b = computeFeeBreakdown({
            dealAmountCents: BigInt(d.deal_amount),
            feePayer,
            gasFeeCents: gas,
            ...(split !== undefined ? { splitBuyerBps: split } : {}),
        });
        return {
            dealAmount: d.deal_amount,
            platformFee: b.platformFeeCents.toString(),
            settlementFee: b.settlementFeeCents.toString(),
            gasFee: b.gasFeeCents.toString(),
            buyerTotal: b.buyerSendsCents.toString(),
            sellerPayout: b.sellerReceivesCents.toString(),
            feePayer,
        };
    }
    catch {
        return base; // amount out of supported range, etc. — fall back to raw columns
    }
}
function roleForUser(deal, userId) {
    if (deal.buyer_id === userId)
        return 'buyer';
    if (deal.seller_id === userId)
        return 'seller';
    if (deal.middleman_id === userId)
        return 'middleman';
    return null;
}
const CATALOG = [
    { kind: 'deal_agreement', label: 'Deal agreement' },
    { kind: 'dispute_decision', label: 'Dispute decision' },
    { kind: 'invoice', label: 'Invoice' },
    { kind: 'receipt', label: 'Receipt' },
    { kind: 'activity_timeline', label: 'Activity timeline' },
    { kind: 'data_export', label: 'Data export' },
];
export async function listDealDocuments(userId, dealId) {
    const access = await getDealAccess(dealId);
    const role = access ? roleForUser(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Deal was not found.');
    }
    const isMiddleman = role === 'middleman';
    const isParty = role === 'buyer' || role === 'seller';
    const { rows } = await query(`SELECT document_type, file_key FROM deal_documents WHERE deal_id = $1`, [dealId]);
    const docMap = new Map(rows.map((r) => [r.document_type, r.file_key]));
    const documents = CATALOG.map(({ kind, label }) => {
        let dbType = kind;
        if (kind === 'deal_agreement')
            dbType = 'agreement';
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
/**
 * Build the deal-agreement PDF bytes on the fly for a caller who is a party to
 * the deal (or the assigned middleman). Deterministic: the same deal produces
 * the same document. Returns the PDF buffer and its stable document number.
 */
async function buildAgreementPdfRaw(userId, dealId) {
    const access = await getDealAccess(dealId);
    const role = access ? roleForUser(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Deal was not found.');
    }
    const { rows } = await query(`SELECT id, buyer_id, seller_id, middleman_id, product_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer, fee_split_buyer_bps, item_description,
            inspection_until::text AS inspection_until,
            complete_by::text AS complete_by,
            fund_by::text AS fund_by,
            status
       FROM deals WHERE id = $1`, [dealId]);
    const deal = rows[0];
    if (!deal) {
        throw notFound('Deal was not found.');
    }
    const termsRes = await query(`SELECT version FROM deal_terms WHERE deal_id = $1 ORDER BY version DESC LIMIT 1`, [dealId]);
    const termsVersion = termsRes.rows[0] ? `v${termsRes.rows[0].version}` : 'v1';
    const m = resolveDealMoney(deal);
    const documentNumber = generateDocumentNumber(dealId);
    const shortId = (v) => (v ? v.replace(/-/g, '').slice(0, 8).toUpperCase() : '—');
    const dt = (v) => (v ? new Date(v).toLocaleString('en-US') : '—');
    const feeShare = m.feePayer === 'split' && deal.fee_split_buyer_bps != null
        ? `split (buyer ${(deal.fee_split_buyer_bps / 100).toFixed(0)}% / seller ${(100 - deal.fee_split_buyer_bps / 100).toFixed(0)}%)`
        : (m.feePayer ?? '—');
    const lines = [
        `Deal ID: ${deal.id}`,
        `Terms version: ${termsVersion}`,
        `Status: ${deal.status}`,
        '',
        'PARTIES',
        `Buyer: ${shortId(deal.buyer_id)}`,
        `Seller: ${shortId(deal.seller_id)}`,
        `Middleman: ${shortId(deal.middleman_id)}`,
        '',
        'SUBJECT',
        `Item: ${deal.item_description ?? '—'}`,
        `Coin / network: ${deal.coin} (${deal.network})`,
        '',
        'AMOUNTS',
        `Deal amount: ${usd(m.dealAmount)}`,
        `Platform fee: ${usd(m.platformFee)}`,
        `Seller settlement fee (0.5%): ${usd(m.settlementFee)}`,
        `Network (gas) fee: ${usd(m.gasFee)}`,
        `Fee payer: ${feeShare}`,
        `Buyer sends (total): ${usd(m.buyerTotal)}`,
        `Seller receives (payout): ${usd(m.sellerPayout)}`,
        '',
        'DEADLINES',
        `Fund by: ${dt(deal.fund_by)}`,
        `Complete by: ${dt(deal.complete_by)}`,
        `Inspection window until: ${dt(deal.inspection_until)}`,
        '',
        'RULES',
        'Funds are held in escrow until release or refund per the accepted escrow, refund/dispute, crypto-risk, wrong-network, and no-prohibited-items terms.',
    ];
    const buffer = renderPdf({
        title: 'Deal Agreement',
        subtitle: 'Locked escrow terms',
        lines,
        footer: `Agreement ${documentNumber} - Generated by TrustVexa - trustvexa.com`,
    });
    return { buffer, documentNumber };
}
export async function buildAgreementPdf(userId, dealId) {
    return getOrBuildDocument(dealId, 'agreement', () => buildAgreementPdfRaw(userId, dealId));
}
// Deal states for which a completed-deal receipt is meaningful.
const RECEIPT_STATES = new Set(['Released', 'Refunded', 'PartiallySettled']);
function money(value) {
    return value === null || value === '' ? '—' : value;
}
/**
 * Build the branded receipt PDF for a completed deal (Released / Refunded /
 * PartiallySettled). Deterministic and only available to a party of the deal or
 * the assigned middleman. (Requirement 37.1)
 */
async function buildReceiptPdfRaw(userId, dealId) {
    const access = await getDealAccess(dealId);
    const role = access ? roleForUser(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Deal was not found.');
    }
    const { rows } = await query(`SELECT id, buyer_id, seller_id, middleman_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer, fee_split_buyer_bps, status,
            updated_at::text AS updated_at
       FROM deals WHERE id = $1`, [dealId]);
    const deal = rows[0];
    if (!deal)
        throw notFound('Deal was not found.');
    if (!RECEIPT_STATES.has(deal.status)) {
        throw new AppError('receipt_unavailable', 'A receipt is available only after the deal is settled.', 409);
    }
    const m = resolveDealMoney(deal);
    const documentNumber = generateDocumentNumber(dealId);
    const settledAt = deal.updated_at ? new Date(deal.updated_at).toLocaleString('en-US') : '—';
    const feeShare = m.feePayer === 'split' && deal.fee_split_buyer_bps != null
        ? `split (buyer ${(deal.fee_split_buyer_bps / 100).toFixed(0)}% / seller ${(100 - deal.fee_split_buyer_bps / 100).toFixed(0)}%)`
        : (m.feePayer ?? '—');
    const lines = [
        'PAYMENT SUMMARY',
        `Deal amount: ${usd(m.dealAmount)}`,
        `Buyer paid (total): ${usd(m.buyerTotal)}`,
        `Seller received: ${usd(m.sellerPayout)}`,
        '',
        'FEES',
        `Platform fee: ${usd(m.platformFee)}`,
        `Settlement fee (0.5%): ${usd(m.settlementFee)}`,
        `Network (gas) fee: ${usd(m.gasFee)}`,
        `Fee payer: ${feeShare}`,
        '',
        'DETAILS',
        `Receipt number: ${documentNumber}`,
        `Deal ID: ${deal.id}`,
        `Status: ${deal.status}`,
        `Coin / network: ${deal.coin} (${deal.network})`,
        `Settled at: ${settledAt}`,
    ];
    const buffer = renderPdf({
        title: 'Payment Receipt',
        subtitle: 'Completed escrow transaction',
        lines,
        footer: `Receipt ${documentNumber} - Generated by TrustVexa - trustvexa.com`,
    });
    return { buffer, documentNumber };
}
export async function buildReceiptPdf(userId, dealId) {
    return getOrBuildDocument(dealId, 'receipt', () => buildReceiptPdfRaw(userId, dealId));
}
/**
 * Build the final dispute-decision PDF for a deal whose dispute has been
 * resolved. Available to a party of the deal or the assigned middleman; throws
 * if no resolved dispute exists. (Requirement 24.6)
 */
async function buildDisputeDecisionPdfRaw(userId, dealId) {
    const access = await getDealAccess(dealId);
    const role = access ? roleForUser(access, userId) : null;
    if (!access || role === null) {
        throw notFound('Deal was not found.');
    }
    const { rows } = await query(`SELECT d.id AS dispute_id, d.reason, d.resolution, d.final_decision_note,
            d.resolved_at::text AS resolved_at,
            s.buyer_refund_amount, s.seller_release_amount, s.type AS settlement_type
       FROM disputes d
       LEFT JOIN settlements s ON s.deal_id = d.deal_id
      WHERE d.deal_id = $1 AND d.status = 'resolved'
      ORDER BY d.resolved_at DESC NULLS LAST, s.created_at DESC NULLS LAST
      LIMIT 1`, [dealId]);
    const row = rows[0];
    if (!row || row.resolution === null) {
        throw new AppError('decision_unavailable', 'A decision document is available only after the dispute is resolved.', 409);
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
export async function buildDisputeDecisionPdf(userId, dealId) {
    return getOrBuildDocument(dealId, 'dispute_decision', () => buildDisputeDecisionPdfRaw(userId, dealId));
}
/**
 * Build the caller's own data export (profile, their deals, and the reviews
 * they have written), never exposing another user's private info. Returns a
 * plain JSON-serializable object the controller streams as a download.
 * (Requirement 37.3)
 */
export async function buildDataExport(userId) {
    const profileRes = await query(`SELECT id, username, account_label, trust_level, created_at::text AS created_at
       FROM users WHERE id = $1 LIMIT 1`, [userId]);
    const p = profileRes.rows[0] ?? null;
    const dealsRes = await query(`SELECT id, buyer_id, seller_id, coin, network, deal_amount, status,
            created_at::text AS created_at
       FROM deals WHERE buyer_id = $1 OR seller_id = $1
      ORDER BY created_at DESC LIMIT 500`, [userId]);
    const reviewsRes = await query(`SELECT deal_id, rating, comment, created_at::text AS created_at
       FROM reviews WHERE reviewer_id = $1
      ORDER BY created_at DESC LIMIT 500`, [userId]);
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
            role: d.buyer_id === userId ? 'buyer' : 'seller',
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
async function getOrBuildDocument(dealId, docType, buildFn) {
    // 1. Check if database row exists
    const { rows } = await query(`SELECT document_number, file_key FROM deal_documents WHERE deal_id = $1 AND document_type = $2 LIMIT 1`, [dealId, docType]);
    const existing = rows[0];
    const storage = getObjectStorage();
    // Only serve the cached copy when it was produced by the current PDF design
    // (the key carries the version tag). Older cached PDFs are rebuilt so every
    // download reflects the latest professional layout.
    if (existing?.file_key && existing.file_key.includes(`_${PDF_DESIGN_VERSION}_`)) {
        const bytes = await storage.get(existing.file_key);
        if (bytes) {
            return { buffer: bytes, documentNumber: existing.document_number };
        }
    }
    // 2. Otherwise build it
    const { buffer, documentNumber } = await buildFn();
    // 3. Upload to storage (version-tagged key)
    const docId = `${PDF_DESIGN_VERSION}_${randomUUID()}`;
    const key = documentKey(dealId, docType, docId);
    await storage.put(key, buffer, 'application/pdf');
    // 4. Save to database
    if (existing) {
        await query(`UPDATE deal_documents SET file_key = $1, created_at = now() WHERE deal_id = $2 AND document_type = $3`, [key, dealId, docType]);
    }
    else {
        await query(`INSERT INTO deal_documents (deal_id, document_type, document_number, file_key, created_at)
       VALUES ($1, $2, $3, $4, now())`, [dealId, docType, documentNumber, key]);
    }
    return { buffer, documentNumber };
}
//# sourceMappingURL=documents.service.js.map