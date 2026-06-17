export function buildLockedAgreement(src, termsVersion, now = new Date()) {
    return {
        dealId: src.id,
        buyerId: src.buyerId,
        sellerId: src.sellerId,
        middlemanId: src.middlemanId,
        productId: src.productId,
        coin: src.coin,
        network: src.network,
        dealAmount: src.dealAmount,
        fees: {
            platformFee: src.platformFee,
            sellerSettlementFee: src.sellerSettlementFee,
            transactionFee: src.transactionFee,
            feePayer: src.feePayer,
        },
        buyerTotal: src.buyerTotal,
        sellerPayout: src.sellerPayout,
        inspectionUntil: src.inspectionUntil,
        completeBy: src.completeBy,
        fundBy: src.fundBy,
        termsVersion,
        generatedAt: now.toISOString(),
    };
}
function line(label, value) {
    return `${label}: ${value ?? '\u2014'}`;
}
/** Deterministic plaintext rendering used as the agreement document body. */
export function renderAgreementText(a) {
    return [
        'TRUSTVEXA DEAL AGREEMENT',
        line('Deal ID', a.dealId),
        line('Terms version', a.termsVersion),
        line('Generated at', a.generatedAt),
        '',
        'PARTIES',
        line('Buyer', a.buyerId),
        line('Seller', a.sellerId),
        line('Middleman', a.middlemanId),
        '',
        'SUBJECT',
        line('Product/Account', a.productId),
        line('Coin', a.coin),
        line('Network', a.network),
        '',
        'AMOUNTS (smallest units / cents)',
        line('Deal amount', a.dealAmount),
        line('Platform fee', a.fees.platformFee),
        line('Seller settlement fee', a.fees.sellerSettlementFee),
        line('Transaction (gas) fee', a.fees.transactionFee),
        line('Fee payer', a.fees.feePayer),
        line('Buyer total', a.buyerTotal),
        line('Seller payout', a.sellerPayout),
        '',
        'DEADLINES',
        line('Fund by', a.fundBy),
        line('Complete by (3-day clock)', a.completeBy),
        line('Inspection window until', a.inspectionUntil),
        '',
        'RULES',
        'Funds are held in escrow until release or refund per the accepted escrow,',
        'refund/dispute, crypto-risk, wrong-network, and no-prohibited-items terms.',
    ].join('\n');
}
/** Stable, unique agreement document number (generated once per deal). */
export function generateDocumentNumber(dealId, now = new Date()) {
    const short = dealId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    return `AGR-${stamp}-${short}`;
}
//# sourceMappingURL=agreement.js.map