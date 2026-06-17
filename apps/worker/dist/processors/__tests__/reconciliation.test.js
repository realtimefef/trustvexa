import { describe, expect, it, vi } from 'vitest';
import { processReconciliation } from '../reconciliation.js';
import { reconciliation as recon, treasuryRepo } from '@trustvexa/api/worker-jobs';
vi.mock('@trustvexa/api/worker-jobs', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        reconciliation: {
            reconcile: vi.fn(),
            isShortfall: vi.fn(),
        },
        treasuryRepo: {
            insertSnapshot: vi.fn(),
        },
    };
});
describe('processReconciliation', () => {
    it('processes reconciliation and logs info when not a shortfall', async () => {
        const job = {
            data: {
                coin: 'USDT',
                network: 'ETH',
                ledgerBalance: '1000',
                onchainBalance: '1000',
                snapshot: {
                    heldInEscrow: '1000',
                    owedToSellers: '800',
                    refundsOwed: '200',
                    platformFeeRevenue: '50',
                    gasSpent: '10',
                    hotBalance: '500',
                    coldBalance: '500',
                },
            },
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                error: vi.fn(),
            },
            db: {},
        };
        const mockResult = {
            reconciled: true,
            status: 'ok',
            delta: 0n,
        };
        vi.mocked(recon.reconcile).mockReturnValue(mockResult);
        vi.mocked(recon.isShortfall).mockReturnValue(false);
        await processReconciliation(job, mockContext);
        expect(recon.reconcile).toHaveBeenCalledWith({
            coin: 'USDT',
            network: 'ETH',
            ledgerBalance: 1000n,
            onchainBalance: 1000n,
        });
        expect(treasuryRepo.insertSnapshot).toHaveBeenCalledWith(mockContext.db, {
            coin: 'USDT',
            network: 'ETH',
            heldInEscrow: 1000n,
            owedToSellers: 800n,
            refundsOwed: 200n,
            platformFeeRevenue: 50n,
            gasSpent: 10n,
            hotBalance: 500n,
            coldBalance: 500n,
            ledgerBalance: 1000n,
            onchainBalance: 1000n,
            reconciled: true,
        });
        expect(mockContext.logger.info).toHaveBeenCalledWith({
            coin: 'USDT',
            network: 'ETH',
            status: 'ok',
            reconciled: true,
            delta: '0',
        }, 'treasury reconciliation recorded');
    });
    it('logs error when shortfall is detected', async () => {
        const job = {
            data: {
                coin: 'USDT',
                network: 'ETH',
                ledgerBalance: '1000',
                onchainBalance: '900',
                snapshot: {
                    heldInEscrow: '1000',
                    owedToSellers: '800',
                    refundsOwed: '200',
                    platformFeeRevenue: '50',
                    gasSpent: '10',
                    hotBalance: '450',
                    coldBalance: '450',
                },
            },
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                error: vi.fn(),
            },
            db: {},
        };
        const mockResult = {
            reconciled: false,
            status: 'shortfall',
            delta: -100n,
        };
        vi.mocked(recon.reconcile).mockReturnValue(mockResult);
        vi.mocked(recon.isShortfall).mockReturnValue(true);
        await processReconciliation(job, mockContext);
        expect(mockContext.logger.error).toHaveBeenCalledWith({
            coin: 'USDT',
            network: 'ETH',
            status: 'shortfall',
            reconciled: false,
            delta: '-100',
        }, 'treasury shortfall detected');
    });
});
//# sourceMappingURL=reconciliation.test.js.map