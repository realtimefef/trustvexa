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
export async function loadDealForAgreement(dealId) {
    const res = await query(`SELECT id, buyer_id, seller_id, middleman_id, product_id, coin, network,
            deal_amount, platform_fee, seller_settlement_fee, transaction_fee,
            buyer_total, seller_payout, fee_payer, inspection_until, complete_by,
            fund_by, status
       FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
export async function loadLatestTerms(dealId) {
    const res = await query(`SELECT version, terms_snapshot, accepted_by_buyer_at, accepted_by_seller_at,
            accepted_by_middleman_at
       FROM deal_terms WHERE deal_id = $1 ORDER BY version DESC LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
const ROLE_COLUMN = {
    buyer: 'accepted_by_buyer_at',
    seller: 'accepted_by_seller_at',
    middleman: 'accepted_by_middleman_at',
};
/** Stamp the acceptance time for one role on the given terms version. */
export async function recordRoleAcceptance(client, dealId, version, role) {
    const column = ROLE_COLUMN[role];
    await client.query(`UPDATE deal_terms SET ${column} = now() WHERE deal_id = $1 AND version = $2`, [dealId, version]);
}
/** Read the buyer/seller acceptance stamps for a version inside a transaction. */
export async function loadAcceptanceState(client, dealId, version) {
    const res = await client.query(`SELECT accepted_by_buyer_at, accepted_by_seller_at
       FROM deal_terms WHERE deal_id = $1 AND version = $2 LIMIT 1`, [dealId, version]);
    const row = res.rows[0];
    return {
        buyer: row?.accepted_by_buyer_at != null,
        seller: row?.accepted_by_seller_at != null,
    };
}
export async function insertLegalAcceptance(client, params) {
    await client.query(`INSERT INTO deal_legal_acceptances
       (deal_id, user_id, accepted_terms_version, accepted_dispute_policy_version,
        accepted_crypto_risk, accepted_wrong_network_warning, accepted_no_prohibited_items,
        accepted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`, [
        params.dealId,
        params.userId,
        params.termsVersion,
        params.disputePolicyVersion,
        params.cryptoRisk,
        params.wrongNetworkWarning,
        params.noProhibitedItems,
    ]);
}
/** Latest published version string for a policy doc type, or null if none. */
export async function getCurrentPolicyVersion(docType) {
    const res = await query(`SELECT version FROM policy_versions
      WHERE doc_type = $1
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT 1`, [docType]);
    return res.rows[0]?.version ?? null;
}
//# sourceMappingURL=terms.repository.js.map