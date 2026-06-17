/**
 * Read-side data access for disputes (task 7.5). Reads are scoped at the
 * service layer to a deal the caller is a party to. Evidence projections
 * intentionally omit storage `file_key`s so raw object keys are never exposed
 * to the parties; only the content hash and review status are returned.
 * (Requirements 24.1-24.7)
 */
import { query } from '@trustvexa/shared';

export interface DealAccessRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  status: string;
}

export async function getDealAccess(dealId: string): Promise<DealAccessRow | null> {
  const res = await query<DealAccessRow>(
    `SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface DisputeRow {
  id: string;
  deal_id: string;
  raised_by: string | null;
  reason: string | null;
  status: string;
  resolution: string | null;
  final_decision_note: string | null;
  decision_pdf_key: string | null;
  resolved_at: Date | string | null;
  created_at: Date | string;
}

export async function getDisputeByDeal(dealId: string): Promise<DisputeRow | null> {
  const res = await query<DisputeRow>(
    `SELECT id, deal_id, raised_by, reason, status, resolution, final_decision_note,
            decision_pdf_key, resolved_at, created_at
       FROM disputes WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface EvidenceRow {
  id: string;
  file_hash: string;
  mime_type: string;
  uploaded_by: string | null;
  review_status: string;
  locked_at: Date | string | null;
  created_at: Date | string;
}

export async function listEvidence(disputeId: string): Promise<EvidenceRow[]> {
  const res = await query<EvidenceRow>(
    `SELECT id, file_hash, mime_type, uploaded_by, review_status, locked_at, created_at
       FROM dispute_evidence WHERE dispute_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [disputeId],
  );
  return res.rows;
}

export interface ThreadRow {
  id: string;
  status: string;
  locked_at: Date | string | null;
  created_at: Date | string;
}

export async function listThreads(disputeId: string): Promise<ThreadRow[]> {
  const res = await query<ThreadRow>(
    `SELECT id, status, locked_at, created_at
       FROM dispute_threads WHERE dispute_id = $1 ORDER BY created_at ASC LIMIT 50`,
    [disputeId],
  );
  return res.rows;
}

/**
 * Access row for a dispute resolved by its own id, joined to the owning deal so
 * the service can authorize the caller as a party (buyer/seller/middleman). A
 * non-party — or a missing dispute — yields `null`, which the service maps to
 * an opaque 404 so the endpoint never confirms someone else's dispute exists.
 */
export interface DisputeAccessRow {
  dispute_id: string;
  deal_id: string;
  dispute_status: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
}

export async function getDisputeAccess(disputeId: string): Promise<DisputeAccessRow | null> {
  const res = await query<DisputeAccessRow>(
    `SELECT d.id AS dispute_id, d.deal_id, d.status AS dispute_status,
            deal.buyer_id, deal.seller_id, deal.middleman_id
       FROM disputes d
       JOIN deals deal ON deal.id = d.deal_id
      WHERE d.id = $1 LIMIT 1`,
    [disputeId],
  );
  return res.rows[0] ?? null;
}

export interface ThreadMessageRow {
  id: string;
  thread_id: string;
  sender_id: string | null;
  body_enc: string | null;
  role: string | null;
  created_at: Date | string;
}

/** List every thread message for a dispute (across its threads), oldest first. */
export async function listThreadMessages(disputeId: string): Promise<ThreadMessageRow[]> {
  const res = await query<ThreadMessageRow>(
    `SELECT m.id, m.thread_id, m.sender_id, m.body_enc, m.role, m.created_at
       FROM dispute_thread_messages m
       JOIN dispute_threads t ON t.id = m.thread_id
      WHERE t.dispute_id = $1
      ORDER BY m.created_at ASC LIMIT 500`,
    [disputeId],
  );
  return res.rows;
}
