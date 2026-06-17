/**
 * Tron deposit-watcher adapter, backed by `tronweb`.
 *
 * `tronweb` is an OPTIONAL runtime dependency loaded only here through a lazy
 * dynamic `import(variableSpecifier)`, so the worker builds and typechecks with
 * zero new dependencies. If the package is missing the import throws and
 * {@link loadTronClient} resolves to `null`, signalling the watcher to skip
 * Tron (manual tx-hash verification remains the fallback).
 *
 * Confirmations are derived from the difference between the current block and
 * the transaction's block (Tron's 20-confirmation threshold lives in the shared
 * API logic). Enumerating historical inbound transfers on Tron requires the
 * TronGrid HTTP indexer rather than a full-node RPC; that integration is gated
 * separately, so until it is configured `getIncomingTransfers` reports nothing
 * and crediting falls back to manual tx-hash verification.
 */
import type { ChainClient } from './chain-client.js';
/**
 * Build a Tron client, lazily importing `tronweb`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export declare function loadTronClient(rpcUrl: string | string[]): Promise<ChainClient | null>;
//# sourceMappingURL=tron-client.d.ts.map