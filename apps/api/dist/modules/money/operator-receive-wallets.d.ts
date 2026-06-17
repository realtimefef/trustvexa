import type { SupportedCoin, SupportedNetwork } from '../deal/deal.schemas.js';
/** Resolve the configured receive address for a coin/network (env overrides default). */
export declare function getOperatorReceiveAddress(coin: SupportedCoin, network: SupportedNetwork): string | null;
/**
 * Validate every configured receive address against its network's format.
 * Returns the list of invalid entries (empty when all are well-formed). Call
 * this at startup so a malformed operator address fails fast instead of being
 * shown to a buyer.
 */
export declare function validateOperatorReceiveWallets(): Array<{
    pair: string;
    address: string;
}>;
/** All configured pairs (for diagnostics / admin display). */
export declare function listOperatorReceiveWallets(): Array<{
    coin: SupportedCoin;
    network: SupportedNetwork;
    address: string;
}>;
//# sourceMappingURL=operator-receive-wallets.d.ts.map