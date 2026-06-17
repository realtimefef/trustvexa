/**
 * EVM deposit-watcher adapter (ETH + BNB), backed by `ethers`.
 *
 * `ethers` is an OPTIONAL runtime dependency: it is loaded only here, via a
 * lazy dynamic `import(variableSpecifier)`, so the worker builds and typechecks
 * with zero new dependencies. If the package is not installed the import throws
 * and {@link loadEvmClient} resolves to `null`, signalling the watcher to skip
 * the chain (manual tx-hash verification remains the fallback).
 *
 * Only the slice of `ethers` actually used is modelled by the local structural
 * interfaces below — the real library is never referenced at the type level.
 * Native-coin transfers are detected by scanning a bounded window of recent
 * blocks; ERC-20 (token) transfers via the standard `Transfer(address,address,
 * uint256)` log topic filtered to the watched address.
 */
import type { ChainClient, Network } from './chain-client.js';
/**
 * Build an EVM client, lazily importing `ethers`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export declare function loadEvmClient(network: Network, rpcUrl: string | string[], env: NodeJS.ProcessEnv): Promise<ChainClient | null>;
//# sourceMappingURL=evm-client.d.ts.map