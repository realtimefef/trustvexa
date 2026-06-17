/**
 * Transaction terms, legal acceptances, and final confirmation (task 4.7,
 * Requirement 11).
 *
 *  - getAgreement: presents the locked deal agreement plus current acceptance
 *    state and the policy versions that must be acknowledged (11.1, 11.2).
 *  - acceptTerms: records one party's acceptance timestamp and per-deal legal
 *    acknowledgements, rejects stale policy versions (11.5), and once BOTH
 *    buyer and seller have accepted, advances Verified -> Confirmed and fixes
 *    the agreement document number (11.3, 11.4). Binary PDF rendering is left
 *    to the document service once object storage is provisioned; the canonical
 *    content and document number are pinned here.
 */
import { AppError } from '../../errors/app-error.js';
import { buildLockedAgreement, generateDocumentNumber, renderAgreementText, } from './agreement.js';
import { acquireClient } from './deal.repository.js';
import { applyDealTransition } from './deal.service.js';
import * as termsRepo from './terms.repository.js';
const TERMS_DOC_TYPE = 'terms';
const DISPUTE_DOC_TYPE = 'dispute_policy';
function iso(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : String(value);
}
function roleForUser(deal, userId) {
    if (deal.buyer_id === userId) {
        return 'buyer';
    }
    if (deal.seller_id === userId) {
        return 'seller';
    }
    if (deal.middleman_id === userId) {
        return 'middleman';
    }
    throw new AppError('not_deal_participant', 'You are not a participant in this deal.', 403);
}
function toAgreementSource(deal) {
    return {
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
        inspectionUntil: iso(deal.inspection_until),
        completeBy: iso(deal.complete_by),
        fundBy: iso(deal.fund_by),
        status: deal.status,
    };
}
export async function getAgreement(args) {
    const deal = await termsRepo.loadDealForAgreement(args.dealId);
    if (deal === null) {
        throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    roleForUser(deal, args.requesterId);
    const terms = await termsRepo.loadLatestTerms(args.dealId);
    const termsVersion = terms ? String(terms.version) : '1';
    const agreement = buildLockedAgreement(toAgreementSource(deal), termsVersion);
    const [currentTerms, currentDispute] = await Promise.all([
        termsRepo.getCurrentPolicyVersion(TERMS_DOC_TYPE),
        termsRepo.getCurrentPolicyVersion(DISPUTE_DOC_TYPE),
    ]);
    return {
        agreement,
        documentText: renderAgreementText(agreement),
        acceptance: {
            buyerAcceptedAt: terms?.accepted_by_buyer_at ?? null,
            sellerAcceptedAt: terms?.accepted_by_seller_at ?? null,
            middlemanAcceptedAt: terms?.accepted_by_middleman_at ?? null,
        },
        requiredPolicyVersions: { terms: currentTerms, disputePolicy: currentDispute },
        requiredAcknowledgements: [
            'acceptedCryptoRisk',
            'acceptedWrongNetworkWarning',
            'acceptedNoProhibitedItems',
        ],
    };
}
export async function acceptTerms(args) {
    const deal = await termsRepo.loadDealForAgreement(args.dealId);
    if (deal === null) {
        throw new AppError('deal_not_found', 'Deal was not found.', 404);
    }
    const role = roleForUser(deal, args.userId);
    if (deal.status !== 'Verified') {
        throw new AppError('terms_not_acceptable', `Terms can only be accepted while the deal is Verified (currently ${deal.status}).`, 409);
    }
    // 11.5: reject acceptance of a stale policy version.
    const [currentTerms, currentDispute] = await Promise.all([
        termsRepo.getCurrentPolicyVersion(TERMS_DOC_TYPE),
        termsRepo.getCurrentPolicyVersion(DISPUTE_DOC_TYPE),
    ]);
    if (currentTerms !== null && args.input.acceptedTermsVersion !== currentTerms) {
        throw new AppError('stale_terms_version', `Terms version ${args.input.acceptedTermsVersion} is out of date; re-accept ${currentTerms}.`, 409);
    }
    if (currentDispute !== null && args.input.acceptedDisputePolicyVersion !== currentDispute) {
        throw new AppError('stale_dispute_policy_version', `Dispute policy version ${args.input.acceptedDisputePolicyVersion} is out of date; re-accept ${currentDispute}.`, 409);
    }
    const terms = await termsRepo.loadLatestTerms(args.dealId);
    const version = terms ? terms.version : 1;
    const client = await acquireClient();
    let bothAccepted = false;
    try {
        await client.query('BEGIN');
        await termsRepo.recordRoleAcceptance(client, args.dealId, version, role);
        await termsRepo.insertLegalAcceptance(client, {
            dealId: args.dealId,
            userId: args.userId,
            termsVersion: args.input.acceptedTermsVersion,
            disputePolicyVersion: args.input.acceptedDisputePolicyVersion,
            cryptoRisk: args.input.acceptedCryptoRisk,
            wrongNetworkWarning: args.input.acceptedWrongNetworkWarning,
            noProhibitedItems: args.input.acceptedNoProhibitedItems,
        });
        const state = await termsRepo.loadAcceptanceState(client, args.dealId, version);
        bothAccepted = state.buyer && state.seller;
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
    let status = deal.status;
    let agreementDocumentNumber = null;
    if (bothAccepted) {
        const result = await applyDealTransition({
            dealId: args.dealId,
            event: 'TermsAccepted',
            actorId: args.userId,
            requestId: `${args.dealId}:terms:v${version}`,
        });
        status = result.to;
        agreementDocumentNumber = generateDocumentNumber(args.dealId);
    }
    return { dealId: args.dealId, role, status, bothAccepted, agreementDocumentNumber };
}
//# sourceMappingURL=terms.service.js.map