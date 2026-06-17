/**
 * Read-side data access for disputes (task 7.5). Reads are scoped at the
 * service layer to a deal the caller is a party to. Evidence projections
 * intentionally omit storage `file_key`s so raw object keys are never exposed
 * to the parties; only the content hash and review status are returned.
 * (Requirements 24.1-24.7)
 */
import { query } from '@trustvexa/shared';
export async function getDealAccess(dealId) {
    const res = await query(`SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
export async function getDisputeByDeal(dealId) {
    const res = await query(`SELECT id, deal_id, raised_by, reason, status, resolution, final_decision_note,
            decision_pdf_key, resolved_at, created_at
       FROM disputes WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
export async function listEvidence(disputeId) {
    const res = await query(`SELECT id, file_hash, mime_type, uploaded_by, review_status, locked_at, created_at
       FROM dispute_evidence WHERE dispute_id = $1 ORDER BY created_at ASC LIMIT 200`, [disputeId]);
    return res.rows;
}
export async function listThreads(disputeId) {
    const res = await query(`SELECT id, status, locked_at, created_at
       FROM dispute_threads WHERE dispute_id = $1 ORDER BY created_at ASC LIMIT 50`, [disputeId]);
    return res.rows;
}
export async function getDisputeAccess(disputeId) {
    const res = await query(`SELECT d.id AS dispute_id, d.deal_id, d.status AS dispute_status,
            deal.buyer_id, deal.seller_id, deal.middleman_id
       FROM disputes d
       JOIN deals deal ON deal.id = d.deal_id
      WHERE d.id = $1 LIMIT 1`, [disputeId]);
    return res.rows[0] ?? null;
}
/** List every thread message for a dispute (across its threads), oldest first. */
export async function listThreadMessages(disputeId) {
    const res = await query(`SELECT m.id, m.thread_id, m.sender_id, m.body_enc, m.role, m.created_at
       FROM dispute_thread_messages m
       JOIN dispute_threads t ON t.id = m.thread_id
      WHERE t.dispute_id = $1
      ORDER BY m.created_at ASC LIMIT 500`, [disputeId]);
    return res.rows;
}
//# sourceMappingURL=dispute-read.repository.js.map