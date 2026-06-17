/**
 * Data access for transaction terms, legal acceptances, and policy versions
 * (task 4.7, Requirement 11).
 *
 * Acceptance timestamps live on the latest `deal_terms` row (one per role); the
 * per-deal legal acknowledgements are appended to `deal_legal_acceptances` as
 * an audit trail; current policy versions are read from `policy_versions` so
 * the service can reject stale acceptances (11.5). All SQL is parameterized;
 * the only interpolated identifier is a role->column lookup from a fixed
 * allow-list, never user input.
 */
import { query } from '@trustvexa/shared';

import type { TxClient } from './deal.repository.js';

export type DealRole = 'buyer' | 'seller' | 'middleman';

export interface TermsDealRow {
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
  inspection_until: string | Date | null;
  complete_by: string | Date | null;
  fund_by: string | Date | null;
  status: string;
}

export async function loadDealForAgreement(dealId: string): Promise<TermsDealRow | null> {
  const res = await query<TermsDealRow>(
    `SELECT id, buyer_id, seller_id, middleman_id, product_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer, inspection_until, complete_by,
            fund_by, status
       FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface TermsRow {
  version: number;
  terms_snapshot: string | null;
  accepted_by_buyer_at: string | null;
  accepted_by_seller_at: string | null;
  accepted_by_middleman_at: string | null;
}

export async function loadLatestTerms(dealId: string): Promise<TermsRow | null> {
  const res = await query<TermsRow>(
    `SELECT version, terms_snapshot, accepted_by_buyer_at, accepted_by_seller_at,
            accepted_by_middleman_at
       FROM deal_terms WHERE deal_id = $1 ORDER BY version DESC LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

const ROLE_COLUMN: Readonly<Record<DealRole, string>> = {
  buyer: 'accepted_by_buyer_at',
  seller: 'accepted_by_seller_at',
  middleman: 'accepted_by_middleman_at',
};

/** Stamp the acceptance time for one role on the given terms version. */
export async function recordRoleAcceptance(
  client: TxClient,
  dealId: string,
  version: number,
  role: DealRole,
): Promise<void> {
  const column = ROLE_COLUMN[role];
  await client.query(
    `UPDATE deal_terms SET ${column} = now() WHERE deal_id = $1 AND version = $2`,
    [dealId, version],
  );
}

/** Read the buyer/seller acceptance stamps for a version inside a transaction. */
export async function loadAcceptanceState(
  client: TxClient,
  dealId: string,
  version: number,
): Promise<{ buyer: boolean; seller: boolean }> {
  const res = await client.query<{
    accepted_by_buyer_at: string | null;
    accepted_by_seller_at: string | null;
  }>(
    `SELECT accepted_by_buyer_at, accepted_by_seller_at
       FROM deal_terms WHERE deal_id = $1 AND version = $2 LIMIT 1`,
    [dealId, version],
  );
  const row = res.rows[0];
  return {
    buyer: row?.accepted_by_buyer_at != null,
    seller: row?.accepted_by_seller_at != null,
  };
}

export interface LegalAcceptanceParams {
  dealId: string;
  userId: string;
  termsVersion: string;
  disputePolicyVersion: string;
  cryptoRisk: boolean;
  wrongNetworkWarning: boolean;
  noProhibitedItems: boolean;
}

export async function insertLegalAcceptance(
  client: TxClient,
  params: LegalAcceptanceParams,
): Promise<void> {
  await client.query(
    `INSERT INTO deal_legal_acceptances
       (deal_id, user_id, accepted_terms_version, accepted_dispute_policy_version,
        accepted_crypto_risk, accepted_wrong_network_warning, accepted_no_prohibited_items,
        accepted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      params.dealId,
      params.userId,
      params.termsVersion,
      params.disputePolicyVersion,
      params.cryptoRisk,
      params.wrongNetworkWarning,
      params.noProhibitedItems,
    ],
  );
}

/** Latest published version string for a policy doc type, or null if none. */
export async function getCurrentPolicyVersion(docType: string): Promise<string | null> {
  const res = await query<{ version: string }>(
    `SELECT version FROM policy_versions
      WHERE doc_type = $1
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT 1`,
    [docType],
  );
  return res.rows[0]?.version ?? null;
}
