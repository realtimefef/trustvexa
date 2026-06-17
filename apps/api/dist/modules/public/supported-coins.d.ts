export type CoinSymbol = 'USDT' | 'SOL' | 'BNB' | 'ETH' | 'TRX';
export type NetworkId = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export interface NetworkInfo {
    id: NetworkId;
    name: string;
    /** Confirmations required before a deposit is treated as final. */
    confirmations: number | 'finalized';
}
export declare const NETWORKS: Readonly<Record<NetworkId, NetworkInfo>>;
export interface CoinInfo {
    symbol: CoinSymbol;
    name: string;
    decimals: number;
    networks: readonly NetworkId[];
}
export declare const SUPPORTED_COINS: readonly CoinInfo[];
export interface SupportedCoinRow {
    symbol: CoinSymbol;
    name: string;
    networks: {
        id: NetworkId;
        name: string;
        confirmations: string;
    }[];
}
/** Shape the catalog for the public page (confirmations rendered as text). */
export declare function buildSupportedCoinsTable(): SupportedCoinRow[];
export declare function isSupportedPair(symbol: string, network: string): boolean;
//# sourceMappingURL=supported-coins.d.ts.map