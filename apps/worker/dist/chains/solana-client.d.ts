/**
 * Solana deposit-watcher adapter, backed by `@solana/web3.js`.
 *
 * `@solana/web3.js` is an OPTIONAL runtime dependency loaded only here through a
 * lazy dynamic `import(variableSpecifier)`, so the worker builds and typechecks
 * with zero new dependencies. If the package is missing the import throws and
 * {@link loadSolanaClient} resolves to `null`, signalling the watcher to skip
 * Solana (manual tx-hash verification remains the fallback).
 *
 * Solana uses commitment (not a confirmation count): a transfer counts as
 * fundable only at `finalized` commitment, surfaced via the `finalized` flag /
 * the literal `'finalized'` confirmation result. Native SOL transfers are
 * detected from the pre/post lamport balance delta of the watched account; SPL
 * token detection is intentionally out of scope for this slice.
 */
import type { ChainClient } from './chain-client.js';
/**
 * Build a Solana client, lazily importing `@solana/web3.js`. Returns `null`
 * when the library is unavailable so the watcher can skip the chain.
 */
export declare function loadSolanaClient(rpcUrl: string | string[]): Promise<ChainClient | null>;
//# sourceMappingURL=solana-client.d.ts.map