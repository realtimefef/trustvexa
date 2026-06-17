/**
 * Pure deal-agreement assembly + rendering (task 4.7, Requirement 11.1/11.3).
 *
 * Side-effect free: it turns a deal row into the canonical "locked agreement"
 * object and a deterministic plaintext rendering used as the agreement
 * document body. Binary PDF rendering is performed downstream by the document
 * renderer; this layer fixes the exact, reproducible content.
 */
export interface DealAgreementSource {
  id: string;
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
  productId: string | null;
  coin: string;
  network: string;
  dealAmount: string | null;
  platformFee: string | null;
  sellerSettlementFee: string | null;
  transactionFee: string | null;
  buyerTotal: string | null;
  sellerPayout: string | null;
  feePayer: string | null;
  inspectionUntil: string | null;
  completeBy: string | null;
  fundBy: string | null;
  status: string;
}

export interface LockedAgreement {
  dealId: string;
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
  productId: string | null;
  coin: string;
  network: string;
  dealAmount: string | null;
  fees: {
    platformFee: string | null;
    sellerSettlementFee: string | null;
    transactionFee: string | null;
    feePayer: string | null;
  };
  buyerTotal: string | null;
  sellerPayout: string | null;
  inspectionUntil: string | null;
  completeBy: string | null;
  fundBy: string | null;
  termsVersion: string;
  generatedAt: string;
}

export function buildLockedAgreement(
  src: DealAgreementSource,
  termsVersion: string,
  now: Date = new Date(),
): LockedAgreement {
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

function line(label: string, value: string | null): string {
  return `${label}: ${value ?? '\u2014'}`;
}

/** Deterministic plaintext rendering used as the agreement document body. */
export function renderAgreementText(a: LockedAgreement): string {
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
export function generateDocumentNumber(dealId: string, now: Date = new Date()): string {
  const short = dealId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `AGR-${stamp}-${short}`;
}
