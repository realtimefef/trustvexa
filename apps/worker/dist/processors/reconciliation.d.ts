/**
 * Treasury reconciliation processor.
 *
 * Compares the internal double-entry ledger balance against the observed
 * on-chain balance for a coin/network using the pure reconciliation engine,
 * persists the resulting treasury snapshot, and raises a high-severity log when
 * a shortfall is detected (ledger says we owe more than the chain holds). The
 * snapshot's component balances arrive in the job payload — the API assembles
 * them from the ledger when scheduling the reconciliation.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processReconciliation(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=reconciliation.d.ts.map