import { describe, expect, it, vi, beforeEach } from 'vitest';
import { processDepositWatch } from '../deposit-watch.js';
import { Queue } from 'bullmq';
import { loadChainClient, isSupportedNetwork } from '../../chains/chain-client.js';
import { confirmations, depositClassification, depositRepo, escrowAddressRepo, openPii, } from '@trustvexa/api/worker-jobs';
vi.mock('bullmq', () => {
    const QueueMock = vi.fn().mockImplementation(() => ({
        add: vi.fn(),
        close: vi.fn(),
    }));
    return { Queue: QueueMock };
});
vi.mock('@trustvexa/shared/redis', () => ({
    createRedisConnection: vi.fn().mockReturnValue({}),
}));
vi.mock('../../chains/chain-client.js', () => ({
    loadChainClient: vi.fn(),
    isSupportedNetwork: vi.fn().mockReturnValue(true),
}));
vi.mock('@trustvexa/api/worker-jobs', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        confirmations: {
            meetsThreshold: vi.fn(),
            baseThreshold: vi.fn().mockReturnValue(12),
        },
        depositClassification: {
            classifyDeposit: vi.fn(),
        },
        depositRepo: {
            loadActiveAllowlist: vi.fn().mockResolvedValue([]),
            upsertPayment: vi.fn(),
            listInboundDeposits: vi.fn().mockResolvedValue([]),
            recordReorgEvent: vi.fn(),
            updateDepositStatus: vi.fn(),
        },
        escrowAddressRepo: {
            listEscrowAddressesAwaitingFunding: vi.fn(),
        },
        openPii: vi.fn(),
        precision: {
            getPrecisionRule: vi.fn().mockReturnValue({ decimals: 6 }),
            fromSmallestUnit: vi.fn((units, decimals) => (Number(units) / 10 ** decimals).toString()),
        },
    };
});
describe('processDepositWatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('runs empty sweep when no pending addresses await funding', async () => {
        vi.mocked(escrowAddressRepo.listEscrowAddressesAwaitingFunding).mockResolvedValue([]);
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {},
        };
        await processDepositWatch({ data: {} }, mockContext);
        expect(escrowAddressRepo.listEscrowAddressesAwaitingFunding).toHaveBeenCalledWith(mockContext.db);
        expect(mockContext.logger.info).toHaveBeenCalledWith(expect.objectContaining({
            pendingAddresses: 0,
            transfersSeen: 0,
            credited: 0,
        }), 'deposit-watch sweep complete');
    });
    it('processes incoming transfers and credits them if they meet threshold', async () => {
        const pendingAddress = {
            deal_id: 'deal-1',
            network: 'ETH',
            coin: 'USDT',
            address: '0xescrow',
            amount_smallest_unit: '1000000',
            risk_score: 10,
            price_tolerance_pct: '1',
        };
        vi.mocked(escrowAddressRepo.listEscrowAddressesAwaitingFunding).mockResolvedValue([
            pendingAddress,
        ]);
        const mockChainClient = {
            getIncomingTransfers: vi.fn().mockResolvedValue([
                {
                    coin: 'USDT',
                    amountSmallestUnit: 1000000n,
                    confirmations: 15,
                    finalized: true,
                    txHash: '0xtxhash',
                    outputIndex: 0,
                },
            ]),
        };
        vi.mocked(loadChainClient).mockResolvedValue(mockChainClient);
        vi.mocked(isSupportedNetwork).mockReturnValue(true);
        vi.mocked(depositClassification.classifyDeposit).mockReturnValue({
            status: 'matched',
            action: 'fund',
            credited: true,
            creditAmountSmallestUnit: 1000000n,
            refundExcessSmallestUnit: 0n,
            shortfallSmallestUnit: 0n,
        });
        vi.mocked(confirmations.meetsThreshold).mockReturnValue(true);
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {
                query: vi.fn().mockResolvedValue({ rows: [] }), // existingPayment check
            },
            withTransaction: async (fn) => fn({}),
        };
        await processDepositWatch({ data: {} }, mockContext);
        expect(loadChainClient).toHaveBeenCalledWith('ETH', expect.any(Object));
        expect(mockChainClient.getIncomingTransfers).toHaveBeenCalledWith('0xescrow', 'USDT', 'ETH');
        expect(depositRepo.upsertPayment).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
            dealId: 'deal-1',
            coin: 'USDT',
            network: 'ETH',
            status: 'credited',
        }));
    });
    it('detects underpayments and sends notifications', async () => {
        const pendingAddress = {
            deal_id: 'deal-1',
            network: 'ETH',
            coin: 'USDT',
            address: '0xescrow',
            amount_smallest_unit: '2000000',
            risk_score: 10,
            price_tolerance_pct: '1',
        };
        vi.mocked(escrowAddressRepo.listEscrowAddressesAwaitingFunding).mockResolvedValue([
            pendingAddress,
        ]);
        const mockChainClient = {
            getIncomingTransfers: vi.fn().mockResolvedValue([
                {
                    coin: 'USDT',
                    amountSmallestUnit: 1000000n,
                    confirmations: 15,
                    finalized: true,
                    txHash: '0xtxhash',
                    outputIndex: 0,
                },
            ]),
        };
        vi.mocked(loadChainClient).mockResolvedValue(mockChainClient);
        vi.mocked(depositClassification.classifyDeposit).mockReturnValue({
            status: 'underpaid',
            action: 'await_topup_or_refund_minus_gas',
            credited: false,
            creditAmountSmallestUnit: 0n,
            refundExcessSmallestUnit: 0n,
            shortfallSmallestUnit: 1000000n,
        });
        vi.mocked(confirmations.meetsThreshold).mockReturnValue(true);
        vi.mocked(openPii).mockResolvedValue('buyer@example.com');
        const mockDbQuery = vi
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // existingPayment
            .mockResolvedValueOnce({ rows: [{ buyer_id: 'buyer-1', title: 'Test Deal' }] }) // deal details
            .mockResolvedValueOnce({ rows: [{ username: 'buyeruser', email_enc: 'sealed-email' }] }) // buyer details
            .mockResolvedValueOnce({ rows: [] }); // notification check (has already notified)
        const mockContext = {
            logger: {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {
                query: mockDbQuery,
            },
            withTransaction: async (fn) => fn({}),
        };
        const queueInstanceMock = {
            add: vi.fn(),
            close: vi.fn(),
        };
        vi.mocked(Queue).mockImplementation(() => queueInstanceMock);
        await processDepositWatch({ data: {} }, mockContext);
        expect(depositRepo.upsertPayment).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
            dealId: 'deal-1',
            status: 'underpaid',
        }));
        // Verifies that underpayment triggers the email and notification queues
        expect(Queue).toHaveBeenCalledWith('email', expect.any(Object));
        expect(Queue).toHaveBeenCalledWith('notification-fanout', expect.any(Object));
    });
});
//# sourceMappingURL=deposit-watch.test.js.map