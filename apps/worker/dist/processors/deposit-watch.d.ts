/**
 * Blockchain deposit-watch processor.
 *
 * The missing piece that makes deals auto-fund: a repeatable sweep that loads
 * every escrow address awaiting funding, queries each on its own chain through
 * the {@link ChainClient} adapter seam, and reuses the API's PURE money logic to
 * decide what to do — `classifyDeposit` (matched/underpaid/overpaid/
 * wrong_network/wrong_coin/fake_token), the per-chain confirmation thresholds
 * (ETH 12 / BNB 15 / Tron 20 / Solana finalized, scaled by risk tier), and the
 * idempotent `(tx_hash, output_index)` deposit upsert. Reorgs are detected by
 * re-checking confirmations of already-recorded deposits and recording a
 * `chain_reorg_events` row when a credited tx drops below threshold or vanishes.
 *
 * No RPC library is a dependency of this service: when a chain's RPC env vars
 * are absent or its optional library cannot be imported, the watcher logs and
 * SKIPS that chain, and manual tx-hash verification remains the fallback.
 */
import { type Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processDepositWatch(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=deposit-watch.d.ts.map