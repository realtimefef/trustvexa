import { reconciliation as recon, treasuryRepo } from '@trustvexa/api/worker-jobs';
import { parseReconciliationJob } from '../payloads.js';
export async function processReconciliation(job, ctx) {
    const data = parseReconciliationJob(job.data);
    const result = recon.reconcile({
        coin: data.coin,
        network: data.network,
        ledgerBalance: data.ledgerBalance,
        onchainBalance: data.onchainBalance,
        ...(data.toleranceUnits !== undefined ? { toleranceUnits: data.toleranceUnits } : {}),
    });
    await treasuryRepo.insertSnapshot(ctx.db, {
        coin: data.coin,
        network: data.network,
        heldInEscrow: data.snapshot.heldInEscrow,
        owedToSellers: data.snapshot.owedToSellers,
        refundsOwed: data.snapshot.refundsOwed,
        platformFeeRevenue: data.snapshot.platformFeeRevenue,
        gasSpent: data.snapshot.gasSpent,
        hotBalance: data.snapshot.hotBalance,
        coldBalance: data.snapshot.coldBalance,
        ledgerBalance: data.ledgerBalance,
        onchainBalance: data.onchainBalance,
        reconciled: result.reconciled,
    });
    const logPayload = {
        coin: data.coin,
        network: data.network,
        status: result.status,
        reconciled: result.reconciled,
        delta: result.delta.toString(),
    };
    if (recon.isShortfall(result)) {
        ctx.logger.error(logPayload, 'treasury shortfall detected');
    }
    else {
        ctx.logger.info(logPayload, 'treasury reconciliation recorded');
    }
}
//# sourceMappingURL=reconciliation.js.map