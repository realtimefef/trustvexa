/**
 * Blockchain client adapter seam for the deposit-watcher.
 *
 * The watcher needs to (a) list incoming transfers to a per-deal escrow address
 * and (b) count confirmations for a given tx so the pure confirmation-threshold
 * logic in `@trustvexa/api/worker-jobs` can decide whether to credit a deal.
 * The concrete RPC libraries (`ethers`, `@solana/web3.js`, `tronweb`) are
 * deliberately NOT dependencies of this service — they are heavy and not always
 * provisioned. Each per-chain adapter therefore loads its library through a
 * lazy dynamic `import(variableSpecifier)` (mirroring how the API's
 * object-storage seam lazily loads `@aws-sdk/client-s3`), behind a minimal
 * structural interface for only the slice of the library we use.
 *
 * When a chain's RPC env vars are absent OR its optional library cannot be
 * imported, {@link loadChainClient} resolves to `null`: the watcher logs and
 * SKIPS that chain, leaving manual tx-hash verification as the guaranteed
 * fallback. Nothing here is imported at module top-level, so the worker BUILDS
 * and TYPECHECKS with zero new dependencies.
 */
/** Networks the watcher understands (matches the API `Chain`/`Network` unions). */
export type Network = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export declare const SUPPORTED_NETWORKS: readonly Network[];
export declare function isSupportedNetwork(value: string): value is Network;
/**
 * A single observed inbound transfer to a watched escrow address. Amounts are
 * integer smallest units to preserve precision across the money boundary.
 */
export interface ObservedTransfer {
    readonly txHash: string;
    /** Index disambiguating multiple transfers in one tx (UTXO/log/event index). */
    readonly outputIndex: number;
    readonly coin: string;
    readonly network: Network;
    readonly amountSmallestUnit: bigint;
    /** Present for token transfers (e.g. USDT contract/mint address). */
    readonly tokenContractAddress?: string;
    /** Confirmations observed for this transfer (Solana reports its finalized flag). */
    readonly confirmations: number;
    /** True when Solana commitment is `finalized`. */
    readonly finalized?: boolean;
}
/**
 * Per-chain client. `getConfirmations` returns the literal `'finalized'` for
 * commitment-based chains (Solana) and a numeric confirmation count otherwise;
 * a tx that can no longer be found returns `0` (treated as a possible reorg).
 */
export interface ChainClient {
    readonly network: Network;
    getIncomingTransfers(address: string, coin: string, network: Network): Promise<ObservedTransfer[]>;
    getConfirmations(txHash: string): Promise<number | 'finalized'>;
}
/** Map a network to the env var that must be present for its RPC endpoint. */
export declare const RPC_ENV_VAR: Readonly<Record<Network, string>>;
/**
 * Lazily construct the {@link ChainClient} for a network. Returns `null` when
 * the network is unknown, its RPC env var is missing, or its optional RPC
 * library is not installed / fails to import. The dynamic imports live inside
 * the per-chain adapters so this factory never statically references a lib.
 */
export declare function loadChainClient(network: string, env: NodeJS.ProcessEnv): Promise<ChainClient | null>;
//# sourceMappingURL=chain-client.d.ts.map