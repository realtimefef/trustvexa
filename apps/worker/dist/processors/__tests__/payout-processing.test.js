import { describe, expect, it, vi } from 'vitest';
import { processPayoutProcessing } from '../payout-processing.js';
import { payoutRepo } from '@trustvexa/api/worker-jobs';
vi.mock('@trustvexa/api/worker-jobs', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        payoutRepo: {
            updatePayoutStatus: vi.fn(),
        },
        triggerWebhook: vi.fn(),
    };
});
describe('processPayoutProcessing', () => {
    it('handles broadcast action successfully', async () => {
        const job = {
            data: {
                payoutId: 'payout-1',
                expectedVersion: 2,
                action: 'broadcast',
                coin: 'USDT',
                network: 'ETH',
                toAddress: '0x123',
                amountSmallestUnit: '1000000',
            },
        };
        const mockDb = {
            query: vi.fn().mockResolvedValue({
                rows: [
                    {
                        payee_id: 'user-1',
                        amount_coin: '1.0',
                        coin: 'USDT',
                        network: 'ETH',
                        address: '0x123',
                    },
                ],
            }),
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: mockDb,
            withTransaction: async (fn) => fn(mockDb),
            adapters: {
                chain: {
                    broadcast: vi.fn().mockResolvedValue({ txHash: '0xhash' }),
                },
            },
        };
        vi.mocked(payoutRepo.updatePayoutStatus).mockResolvedValue(3);
        await processPayoutProcessing(job, mockContext);
        expect(mockContext.adapters.chain.broadcast).toHaveBeenCalledWith({
            coin: 'USDT',
            network: 'ETH',
            toAddress: '0x123',
            amountSmallestUnit: 1000000n,
        });
        expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(mockDb, 'payout-1', 2, 'broadcast', '0xhash');
        expect(mockContext.logger.info).toHaveBeenCalled();
    });
    it('handles broadcast version mismatch', async () => {
        const job = {
            data: {
                payoutId: 'payout-1',
                expectedVersion: 2,
                action: 'broadcast',
                coin: 'USDT',
                network: 'ETH',
                toAddress: '0x123',
                amountSmallestUnit: '1000000',
            },
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {},
            adapters: {
                chain: {
                    broadcast: vi.fn().mockResolvedValue({ txHash: '0xhash' }),
                },
            },
        };
        vi.mocked(payoutRepo.updatePayoutStatus).mockResolvedValue(null);
        await processPayoutProcessing(job, mockContext);
        expect(mockContext.logger.warn).toHaveBeenCalledWith({ payout_id: 'payout-1', expected_version: 2 }, 'payout broadcast: optimistic version conflict, skipping');
    });
    it('handles confirm action successfully', async () => {
        const job = {
            data: {
                payoutId: 'payout-2',
                expectedVersion: 3,
                action: 'confirm',
                coin: 'USDT',
                network: 'ETH',
                toAddress: '0x123',
                amountSmallestUnit: '1000000',
                txHash: '0xhash',
            },
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {},
            adapters: {},
        };
        vi.mocked(payoutRepo.updatePayoutStatus).mockResolvedValue(4);
        await processPayoutProcessing(job, mockContext);
        expect(payoutRepo.updatePayoutStatus).toHaveBeenCalledWith(mockContext.db, 'payout-2', 3, 'confirmed', '0xhash');
        expect(mockContext.logger.info).toHaveBeenCalledWith({ payout_id: 'payout-2', version: 4 }, 'payout confirmed');
    });
});
//# sourceMappingURL=payout-processing.test.js.map