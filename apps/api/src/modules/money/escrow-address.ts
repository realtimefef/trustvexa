// Per-deal escrow deposit addresses and payment instructions (task 5.17).
// Pure presentation/validation helpers; derivation persistence lives in
// escrow-address.repository.ts. Explorer links and the address itself are only
// shown to the deal's buyer, seller, and middleman. (Requirements 19.1-19.4, 19.9)

export type Network = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export type DealRole = 'buyer' | 'seller' | 'middleman';

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidAddress(network: Network, address: string): boolean {
  switch (network) {
    case 'ETH':
    case 'BNB':
      return EVM_RE.test(address);
    case 'TRON':
      return TRON_RE.test(address);
    case 'SOLANA':
      return SOL_RE.test(address);
  }
}

/** Abbreviated address for safe visual confirmation, e.g. 0x1234…5678. */
export function shortAddressPreview(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}\u2026${address.slice(-tail)}`;
}

export function explorerAddressUrl(network: Network, address: string): string {
  switch (network) {
    case 'ETH':
      return `https://etherscan.io/address/${address}`;
    case 'BNB':
      return `https://bscscan.com/address/${address}`;
    case 'TRON':
      return `https://tronscan.org/#/address/${address}`;
    case 'SOLANA':
      return `https://solscan.io/account/${address}`;
  }
}

export function explorerTxUrl(network: Network, txHash: string): string {
  switch (network) {
    case 'ETH':
      return `https://etherscan.io/tx/${txHash}`;
    case 'BNB':
      return `https://bscscan.com/tx/${txHash}`;
    case 'TRON':
      return `https://tronscan.org/#/transaction/${txHash}`;
    case 'SOLANA':
      return `https://solscan.io/tx/${txHash}`;
  }
}

export interface DealParties {
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
}

/** Escrow address + explorer links are visible only to the deal's parties. */
export function canViewEscrowAddress(viewerUserId: string, deal: DealParties): boolean {
  return (
    viewerUserId === deal.buyerId ||
    viewerUserId === deal.sellerId ||
    viewerUserId === deal.middlemanId
  );
}

export interface PaymentInstructionInput {
  coin: string;
  network: Network;
  address: string;
  amountCoin: string; // exact human amount, e.g. '0.5'
  amountSmallestUnit: bigint;
}

export interface PaymentInstructions {
  coin: string;
  network: Network;
  address: string;
  addressPreview: string;
  exactAmountCoin: string;
  exactAmountSmallestUnit: string;
  networkWarning: string;
  requiresWrongNetworkAck: true;
  qrPayload: string;
  explorerAddressUrl: string;
}

export function buildPaymentInstructions(input: PaymentInstructionInput): PaymentInstructions {
  if (!isValidAddress(input.network, input.address)) {
    throw new Error(`invalid ${input.network} address`);
  }
  if (input.amountSmallestUnit <= 0n) {
    throw new Error('payment amount must be positive');
  }
  return {
    coin: input.coin,
    network: input.network,
    address: input.address,
    addressPreview: shortAddressPreview(input.address),
    exactAmountCoin: input.amountCoin,
    exactAmountSmallestUnit: input.amountSmallestUnit.toString(),
    networkWarning: `Send ONLY ${input.coin} on the ${input.network} network to this address. Funds sent on any other network or as any other asset may be lost.`,
    requiresWrongNetworkAck: true,
    qrPayload: `${input.coin.toLowerCase()}:${input.address}?amount=${input.amountCoin}`,
    explorerAddressUrl: explorerAddressUrl(input.network, input.address),
  };
}
