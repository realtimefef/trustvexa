/**
 * FX refresh processor.
 *
 * Pulls fresh quotes from the FX provider seam, runs them through the domain's
 * pure rate-selection guard (staleness + tolerance + sanity band), and records
 * the resulting price-sanity outcome. The provider is operator-provisioned, so
 * until credentials exist the seam throws and the job dead-letters instead of
 * locking in an unvalidated rate.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processFxRefresh(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=fx-refresh.d.ts.map