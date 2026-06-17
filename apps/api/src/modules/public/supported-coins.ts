// Supported coins & networks catalog for the public supported-coins page.
// (task 8.1, Requirement 42.3). Confirmation depths mirror the deposit
// classifier: ETH 12, BNB 15, Tron 20, Solana = finalized.

export type CoinSymbol = 'USDT' | 'SOL' | 'BNB' | 'ETH' | 'TRX';
export type NetworkId = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';

export interface NetworkInfo {
  id: NetworkId;
  name: string;
  /** Confirmations required before a deposit is treated as final. */
  confirmations: number | 'finalized';
}

export const NETWORKS: Readonly<Record<NetworkId, NetworkInfo>> = {
  ETH: { id: 'ETH', name: 'Ethereum', confirmations: 12 },
  BNB: { id: 'BNB', name: 'BNB Smart Chain', confirmations: 15 },
  TRON: { id: 'TRON', name: 'Tron', confirmations: 20 },
  SOLANA: { id: 'SOLANA', name: 'Solana', confirmations: 'finalized' },
};

export interface CoinInfo {
  symbol: CoinSymbol;
  name: string;
  decimals: number;
  networks: readonly NetworkId[];
}

export const SUPPORTED_COINS: readonly CoinInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, networks: ['ETH', 'BNB', 'TRON'] },
  { symbol: 'ETH', name: 'Ether', decimals: 18, networks: ['ETH'] },
  { symbol: 'BNB', name: 'BNB', decimals: 18, networks: ['BNB'] },
  { symbol: 'TRX', name: 'Tron', decimals: 6, networks: ['TRON'] },
  { symbol: 'SOL', name: 'Solana', decimals: 9, networks: ['SOLANA'] },
];

export interface SupportedCoinRow {
  symbol: CoinSymbol;
  name: string;
  networks: { id: NetworkId; name: string; confirmations: string }[];
}

/** Shape the catalog for the public page (confirmations rendered as text). */
export function buildSupportedCoinsTable(): SupportedCoinRow[] {
  return SUPPORTED_COINS.map((coin) => ({
    symbol: coin.symbol,
    name: coin.name,
    networks: coin.networks.map((nid) => {
      const net = NETWORKS[nid];
      return {
        id: net.id,
        name: net.name,
        confirmations:
          net.confirmations === 'finalized' ? 'Finalized' : `${net.confirmations} confirmations`,
      };
    }),
  }));
}

export function isSupportedPair(symbol: string, network: string): boolean {
  const coin = SUPPORTED_COINS.find((c) => c.symbol === symbol);
  if (!coin) return false;
  return (coin.networks as readonly string[]).includes(network);
}
