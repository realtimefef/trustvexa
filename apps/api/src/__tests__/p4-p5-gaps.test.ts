import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==========================================
// 1. Declare and hoist mocks using vi.hoisted
// ==========================================

const mocks = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  mockDbQuery: vi.fn(),
  mockClientQuery: vi.fn(),
  mockClientRelease: vi.fn(),
  mockGetChatWithParties: vi.fn(),
  mockGetDraftForChat: vi.fn(),
  mockListChatsForUser: vi.fn(),
  mockListMessagesForChat: vi.fn(),
  mockMessageIdsInChat: vi.fn(),
  mockSearchMessagesForChat: vi.fn(),
  mockLoadMessage: vi.fn(),
  mockAddReactionRow: vi.fn(),
  mockRemoveReactionRow: vi.fn(),
  mockPinMessageRow: vi.fn(),
  mockUnpinMessageRow: vi.fn(),
  mockInsertMessage: vi.fn(),
  mockInsertAttachment: vi.fn(),
  mockListAuditLogs: vi.fn(),
  mockInsertAnnouncement: vi.fn(),
  mockEthersProvider: {
    getBlockNumber: vi.fn(),
    getBlock: vi.fn(),
    getTransactionReceipt: vi.fn(),
    getLogs: vi.fn(),
  },
  mockSolConnection: {
    getSignaturesForAddress: vi.fn(),
    getTransaction: vi.fn(),
    getSignatureStatuses: vi.fn(),
  },
  mockTronTrx: {
    getCurrentBlock: vi.fn(),
    getTransactionInfo: vi.fn(),
  },
  mockExecSync: vi.fn(),
  mockPgClient: {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  },
}));

// ==========================================
// 2. Wire the hoisted mocks into module mocks
// ==========================================

vi.mock('@trustvexa/shared', () => ({
  getRedis: () => mocks.mockRedis,
  query: mocks.mockDbQuery,
  getClient: async () => ({
    query: mocks.mockClientQuery,
    release: mocks.mockClientRelease,
  }),
  pg: {
    Client: vi.fn().mockImplementation(() => mocks.mockPgClient),
  },
}));

vi.mock('../modules/chat/chat-read.repository.js', () => ({
  getChatWithParties: mocks.mockGetChatWithParties,
  getDraftForChat: mocks.mockGetDraftForChat,
  listChatsForUser: mocks.mockListChatsForUser,
  listMessagesForChat: mocks.mockListMessagesForChat,
  messageIdsInChat: mocks.mockMessageIdsInChat,
  searchMessagesForChat: mocks.mockSearchMessagesForChat,
}));

vi.mock('../modules/chat/message.repository.js', () => ({
  loadMessage: mocks.mockLoadMessage,
  addReaction: mocks.mockAddReactionRow,
  removeReaction: mocks.mockRemoveReactionRow,
  pinMessage: mocks.mockPinMessageRow,
  unpinMessage: mocks.mockUnpinMessageRow,
  insertMessage: mocks.mockInsertMessage,
  editMessage: vi.fn(),
  softDeleteMessage: vi.fn(),
  upsertDraft: vi.fn(),
  upsertReceipt: vi.fn(),
}));

vi.mock('../modules/chat/attachment.repository.js', () => ({
  insertAttachment: mocks.mockInsertAttachment,
}));

vi.mock('../modules/admin/admin-ops.repository.js', () => ({
  listAuditLogs: mocks.mockListAuditLogs,
  insertAnnouncement: mocks.mockInsertAnnouncement,
}));

vi.mock('ethers', () => {
  return {
    JsonRpcProvider: vi.fn().mockImplementation(() => mocks.mockEthersProvider),
  };
});

vi.mock('@solana/web3.js', () => {
  return {
    Connection: vi.fn().mockImplementation(() => mocks.mockSolConnection),
    PublicKey: vi.fn().mockImplementation((val) => ({ toBase58: () => val })),
  };
});

vi.mock('tronweb', () => {
  class MockTronWeb {
    trx = mocks.mockTronTrx;
  }
  return {
    default: MockTronWeb,
    TronWeb: MockTronWeb,
  };
});

vi.mock('node:child_process', () => ({
  execFileSync: mocks.mockExecSync,
}));

// ==========================================
// 3. Import services to test after mocks are registered
// ==========================================

import {
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  forwardMessage,
} from '../modules/chat/chat.service.js';
import { openDisputeForParty } from '../modules/disputes/dispute.service.js';

import { getAuditLog, createAnnouncement } from '../modules/admin/admin-ops.service.js';

import {
  checkFailedLoginAbuse,
  checkInviteCodeAbuse,
  checkDealCreationVelocity,
} from '../lib/abuse-detector.js';

import { loadEvmClient } from '../../../worker/src/chains/evm-client.js';
import { loadSolanaClient } from '../../../worker/src/chains/solana-client.js';
import { loadTronClient } from '../../../worker/src/chains/tron-client.js';
import { runBackupRestoreTest } from '../../../worker/src/processors/backup-restore-test.js';

describe('P4 - Chat Reactions, Pins, Forwards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup chat room participants to satisfy membership checks
    mocks.mockGetChatWithParties.mockResolvedValue({
      id: 'chat-1',
      deal_id: 'deal-1',
      type: 'buyer_seller',
      status: 'open',
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      middleman_id: 'middleman-1',
    });
  });

  it('addReaction calls repository on authorized chat', async () => {
    mocks.mockLoadMessage.mockResolvedValue({ id: 'msg-1', chat_id: 'chat-1' });
    const res = await addReaction('buyer-1', 'chat-1', 'msg-1', '👍');
    expect(res.success).toBe(true);
    expect(mocks.mockAddReactionRow).toHaveBeenCalledWith(
      expect.any(Object),
      'msg-1',
      'buyer-1',
      '👍',
    );
  });

  it('removeReaction calls repository on authorized chat', async () => {
    mocks.mockLoadMessage.mockResolvedValue({ id: 'msg-1', chat_id: 'chat-1' });
    const res = await removeReaction('buyer-1', 'chat-1', 'msg-1', '👍');
    expect(res.success).toBe(true);
    expect(mocks.mockRemoveReactionRow).toHaveBeenCalledWith(
      expect.any(Object),
      'msg-1',
      'buyer-1',
      '👍',
    );
  });

  it('pinMessage calls repository on authorized chat', async () => {
    mocks.mockLoadMessage.mockResolvedValue({ id: 'msg-1', chat_id: 'chat-1' });
    const res = await pinMessage('buyer-1', 'chat-1', 'msg-1');
    expect(res.success).toBe(true);
    expect(mocks.mockPinMessageRow).toHaveBeenCalledWith(
      expect.any(Object),
      'msg-1',
      'buyer-1',
      'chat-1',
    );
  });

  it('unpinMessage calls repository on authorized chat', async () => {
    mocks.mockLoadMessage.mockResolvedValue({ id: 'msg-1', chat_id: 'chat-1' });
    const res = await unpinMessage('buyer-1', 'chat-1', 'msg-1');
    expect(res.success).toBe(true);
    expect(mocks.mockUnpinMessageRow).toHaveBeenCalledWith(expect.any(Object), 'msg-1', 'chat-1');
  });

  it('forwardMessage inserts message as copy into destination chat', async () => {
    mocks.mockLoadMessage.mockResolvedValue({
      id: 'msg-1',
      chat_id: 'chat-1',
      body_enc: 'Hello World',
    });
    mocks.mockInsertMessage.mockResolvedValue({
      id: 'msg-new',
      chat_id: 'chat-2',
      sender_id: 'buyer-1',
      body_enc: 'Hello World',
      is_edited: false,
      forwarded_from_message_id: 'msg-1',
    });
    mocks.mockClientQuery.mockResolvedValue({ rows: [] }); // attachments query

    const res = await forwardMessage('buyer-1', 'chat-1', 'msg-1', 'chat-1');
    expect(res.id).toBe('msg-new');
    expect(res.forwardedFrom).toBe('msg-1');
    expect(mocks.mockInsertMessage).toHaveBeenCalledWith(expect.any(Object), {
      chatId: 'chat-1',
      senderId: 'buyer-1',
      bodyEnc: 'Hello World',
      forwardedFromMessageId: 'msg-1',
    });
  });
});

describe('P4 - Admin Operations & Audit Logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAuditLog fetches logs from repository', async () => {
    const logs = [{ id: '1', action: 'block' }];
    mocks.mockListAuditLogs.mockResolvedValue(logs);
    const res = await getAuditLog();
    expect(res.auditLog[0]?.id).toBe('1');
    expect(mocks.mockListAuditLogs).toHaveBeenCalled();
  });

  it('createAnnouncement inserts into db and records audit action', async () => {
    mocks.mockInsertAnnouncement.mockResolvedValue({
      id: 'ann-1',
      title: 'Hi',
      body: 'Welcome',
      audience: 'all',
      starts_at: null,
      ends_at: null,
      created_at: null,
    });
    // mock appendAdminAction's queries inside transaction
    mocks.mockClientQuery.mockResolvedValue({ rows: [{ id: 'admin-action-id' }] });

    const res = await createAnnouncement({
      actorId: 'admin-1',
      title: 'Hi',
      body: 'Welcome',
      audience: 'all',
      startsAt: null,
      endsAt: null,
      requestId: 'req-1',
    });
    expect(res.announcement.id).toBe('ann-1');
    expect(mocks.mockInsertAnnouncement).toHaveBeenCalled();
  });
});

describe('P5 - Abuse Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checkFailedLoginAbuse logs to abuse_flags if limit exceeded', async () => {
    mocks.mockRedis.incr.mockResolvedValue(11);
    mocks.mockRedis.get.mockResolvedValue(null); // not yet flagged

    await checkFailedLoginAbuse('127.0.0.1', 'test@test.com');

    expect(mocks.mockRedis.incr).toHaveBeenCalledWith('abuse:login:127.0.0.1');
    expect(mocks.mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO abuse_flags'),
      ['ip:127.0.0.1', 'failed_login', expect.stringContaining('More than 10 failed login')],
    );
  });

  it('checkInviteCodeAbuse logs if limit exceeded', async () => {
    mocks.mockRedis.incr.mockResolvedValue(6);
    mocks.mockRedis.get.mockResolvedValue(null);

    await checkInviteCodeAbuse('user-1', 'token-123');

    expect(mocks.mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO abuse_flags'),
      ['user:user-1', 'invalid_invite', expect.stringContaining('More than 5 attempts')],
    );
  });

  it('checkDealCreationVelocity logs if limit exceeded', async () => {
    mocks.mockRedis.incr.mockResolvedValue(21);
    mocks.mockRedis.get.mockResolvedValue(null);

    await checkDealCreationVelocity('user-1');

    expect(mocks.mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO abuse_flags'),
      ['user:user-1', 'deal_velocity', expect.stringContaining('More than 20 deals')],
    );
  });
});

describe('P5 - Blockchain RPC Failover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EVM provider fails over to second url if first throws', async () => {
    const env = { DEPOSIT_WATCH_BLOCK_WINDOW_ETH: '10' };
    const urls = ['http://first-fail', 'http://second-ok'];

    // Setup provider to fail on first call and succeed on second
    let callCount = 0;
    mocks.mockEthersProvider.getBlockNumber.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error');
      return 12345;
    });

    const client = await loadEvmClient('ETH', urls, env);
    expect(client).not.toBeNull();

    // Trigger getConfirmations, which triggers getBlockNumber inside
    mocks.mockEthersProvider.getTransactionReceipt.mockResolvedValue({ blockNumber: 12340 });
    const confirmations = await client!.getConfirmations('0xtxhash');
    expect(confirmations).toBe(6); // 12345 - 12340 + 1 = 6
    expect(callCount).toBe(2);
  });

  it('Solana connection fails over to second url if first throws', async () => {
    const urls = ['http://sol-fail', 'http://sol-ok'];
    let callCount = 0;
    mocks.mockSolConnection.getSignatureStatuses.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Solana error');
      return { value: [{ confirmationStatus: 'finalized' }] };
    });

    const client = await loadSolanaClient(urls);
    expect(client).not.toBeNull();

    const confirmations = await client!.getConfirmations('sol-signature');
    expect(confirmations).toBe('finalized');
    expect(callCount).toBe(2);
  });

  it('Tron connection fails over to second url if first throws', async () => {
    const urls = ['http://tron-fail', 'http://tron-ok'];
    let callCount = 0;
    mocks.mockTronTrx.getCurrentBlock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Tron error');
      return { block_header: { raw_data: { number: 9999 } } };
    });

    const client = await loadTronClient(urls);
    expect(client).not.toBeNull();

    mocks.mockTronTrx.getTransactionInfo.mockResolvedValue({ blockNumber: 9990 });
    const confirmations = await client!.getConfirmations('tron-tx');
    expect(confirmations).toBe(10); // 9999 - 9990 + 1 = 10
    expect(callCount).toBe(2);
  });
});

describe('P6 - Backup Restore Verification Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://postgres@localhost:5432/trustvexa_prod';
    process.env.DATABASE_URL_TEST = 'postgres://postgres@localhost:5432/trustvexa_test';
  });

  it('runs pg_dump, psql restore, user check, and logs success to backup_jobs', async () => {
    mocks.mockPgClient.query.mockResolvedValue({ rows: [{ count: '15' }] });

    const ctx = {
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      db: {
        query: mocks.mockDbQuery,
      },
      withTransaction: vi.fn(),
      adapters: {} as any,
    };

    await runBackupRestoreTest(ctx as any);

    expect(mocks.mockExecSync).toHaveBeenCalledWith(
      'pg_dump',
      expect.arrayContaining([process.env.DATABASE_URL]),
      expect.any(Object),
    );
    expect(mocks.mockExecSync).toHaveBeenCalledWith(
      'psql',
      expect.arrayContaining([process.env.DATABASE_URL_TEST]),
      expect.any(Object),
    );
    expect(mocks.mockPgClient.connect).toHaveBeenCalled();
    expect(mocks.mockPgClient.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM users');
    expect(mocks.mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO backup_jobs'),
    );
  });
});

describe('GAP-3 - Dispute Middleman Pre-selection and Auto-assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns the preferred middleman if they are active', async () => {
    let queryCallCount = 0;
    mocks.mockClientQuery.mockImplementation(async (text: string, params?: any[]) => {
      queryCallCount++;
      const q = text.replace(/\s+/g, ' ').trim();

      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (q.startsWith('INSERT INTO idempotency_keys')) {
        return { rows: [{ id: 'idem-1' }], rowCount: 1 };
      }
      if (q.startsWith('SELECT id, buyer_id, seller_id, middleman_id, preferred_middleman_id')) {
        return {
          rows: [
            {
              id: 'deal-1',
              buyer_id: 'buyer-1',
              seller_id: 'seller-1',
              middleman_id: null,
              preferred_middleman_id: 'pref-mm-1',
              status: 'Funded',
              coin: 'ETH',
              network: 'ETH',
              amount_smallest_unit: '1000',
              version_no: 1,
            },
          ],
          rowCount: 1,
        };
      }
      if (
        q.includes("account_type = 'middleman'") &&
        q.includes("account_status = 'active'") &&
        !q.includes('LEFT JOIN deals')
      ) {
        expect(params?.[0]).toBe('pref-mm-1');
        return { rows: [{ id: 'pref-mm-1' }], rowCount: 1 };
      }
      if (q.startsWith('UPDATE deals SET middleman_id = $1')) {
        expect(params?.[0]).toBe('pref-mm-1');
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith('SELECT entry_hash FROM escrow_logs')) {
        return { rows: [{ entry_hash: 'prev-hash' }], rowCount: 1 };
      }
      if (
        q.startsWith('UPDATE deals SET version_no = version_no + 1') ||
        q.startsWith('UPDATE deals SET status = ') ||
        q.startsWith('UPDATE deals SET status = $2::deal_status')
      ) {
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO escrow_logs')) {
        return { rows: [{ id: 'log-1' }], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO disputes')) {
        return {
          rows: [
            {
              id: 'dispute-1',
              deal_id: 'deal-1',
              raised_by: 'buyer-1',
              reason: 'item_not_received',
              status: 'open',
              resolution: null,
              final_decision_note: null,
              decision_pdf_key: null,
              resolved_at: null,
              created_at: new Date().toISOString(),
            },
          ],
          rowCount: 1,
        };
      }
      if (q.startsWith('INSERT INTO dispute_threads')) {
        return { rows: [{ id: 'thread-1' }], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO dispute_thread_messages')) {
        return { rows: [{ id: 'msg-1' }], rowCount: 1 };
      }
      if (q.startsWith("UPDATE idempotency_keys SET status = 'succeeded'")) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${q}`);
    });

    const res = await openDisputeForParty({
      userId: 'buyer-1',
      dealId: 'deal-1',
      idempotencyKey: 'idem-key-1',
      requestId: 'req-1',
      category: 'item_not_received' as any,
      statement: 'My item did not arrive',
    });

    expect(res.disputeId).toBe('dispute-1');
    expect(res.dealId).toBe('deal-1');
  });

  it('auto-assigns an active middleman via load-balancing if no preferred middleman or preferred middleman is inactive', async () => {
    mocks.mockClientQuery.mockImplementation(async (text: string, params?: any[]) => {
      const q = text.replace(/\s+/g, ' ').trim();

      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (q.startsWith('INSERT INTO idempotency_keys')) {
        return { rows: [{ id: 'idem-1' }], rowCount: 1 };
      }
      if (q.startsWith('SELECT id, buyer_id, seller_id, middleman_id, preferred_middleman_id')) {
        return {
          rows: [
            {
              id: 'deal-1',
              buyer_id: 'buyer-1',
              seller_id: 'seller-1',
              middleman_id: null,
              preferred_middleman_id: null,
              status: 'Funded',
              coin: 'ETH',
              network: 'ETH',
              amount_smallest_unit: '1000',
              version_no: 1,
            },
          ],
          rowCount: 1,
        };
      }
      if (q.includes('LEFT JOIN deals') && q.includes("account_type = 'middleman'")) {
        return { rows: [{ id: 'auto-mm-1' }], rowCount: 1 };
      }
      if (q.startsWith('UPDATE deals SET middleman_id = $1')) {
        expect(params?.[0]).toBe('auto-mm-1');
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith('SELECT entry_hash FROM escrow_logs')) {
        return { rows: [{ entry_hash: 'prev-hash' }], rowCount: 1 };
      }
      if (
        q.startsWith('UPDATE deals SET version_no = version_no + 1') ||
        q.startsWith('UPDATE deals SET status = ') ||
        q.startsWith('UPDATE deals SET status = $2::deal_status')
      ) {
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO escrow_logs')) {
        return { rows: [{ id: 'log-1' }], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO disputes')) {
        return {
          rows: [
            {
              id: 'dispute-1',
              deal_id: 'deal-1',
              raised_by: 'buyer-1',
              reason: 'item_not_received',
              status: 'open',
              resolution: null,
              final_decision_note: null,
              decision_pdf_key: null,
              resolved_at: null,
              created_at: new Date().toISOString(),
            },
          ],
          rowCount: 1,
        };
      }
      if (q.startsWith('INSERT INTO dispute_threads')) {
        return { rows: [{ id: 'thread-1' }], rowCount: 1 };
      }
      if (q.startsWith('INSERT INTO dispute_thread_messages')) {
        return { rows: [{ id: 'msg-1' }], rowCount: 1 };
      }
      if (q.startsWith("UPDATE idempotency_keys SET status = 'succeeded'")) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${q}`);
    });

    const res = await openDisputeForParty({
      userId: 'buyer-1',
      dealId: 'deal-1',
      idempotencyKey: 'idem-key-2',
      requestId: 'req-2',
      category: 'item_not_received' as any,
      statement: 'My item did not arrive',
    });

    expect(res.disputeId).toBe('dispute-1');
    expect(res.dealId).toBe('deal-1');
  });
});
