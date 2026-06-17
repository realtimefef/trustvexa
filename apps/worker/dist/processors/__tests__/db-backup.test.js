import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { processDbBackup } from '../db-backup.js';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { getObjectStorage } from '@trustvexa/api/worker-jobs';
import { Queue } from 'bullmq';
vi.mock('node:child_process', () => ({
    execFileSync: vi.fn(),
}));
vi.mock('node:fs', () => ({
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn(),
}));
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
vi.mock('@trustvexa/api/worker-jobs', async (importOriginal) => {
    const original = await importOriginal();
    const mockStorage = {
        put: vi.fn(),
    };
    return {
        ...original,
        getObjectStorage: vi.fn().mockReturnValue(mockStorage),
    };
});
describe('processDbBackup', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it('skips backup if DATABASE_URL is not set', async () => {
        delete process.env.DATABASE_URL;
        const mockContext = {
            logger: {
                error: vi.fn(),
            },
        };
        await processDbBackup({}, mockContext);
        expect(mockContext.logger.error).toHaveBeenCalledWith('DATABASE_URL not set. Skipping scheduled DB backup.');
    });
    it('executes backup workflow successfully', async () => {
        process.env.DATABASE_URL = 'postgres://localhost/test';
        const mockDb = {
            query: vi.fn().mockResolvedValue({
                rows: [{ id: 'backup-job-1' }],
            }),
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                error: vi.fn(),
            },
            db: mockDb,
        };
        const mockBytes = Buffer.from('mock sql dump');
        vi.mocked(fs.readFileSync).mockReturnValue(mockBytes);
        const storage = getObjectStorage();
        await processDbBackup({}, mockContext);
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO backup_jobs'), expect.any(Array));
        expect(execFileSync).toHaveBeenCalledWith('pg_dump', ['postgres://localhost/test', '-f', expect.any(String), '--no-owner', '--clean'], { stdio: ['ignore', 'ignore', 'pipe'] });
        expect(fs.readFileSync).toHaveBeenCalled();
        expect(storage.put).toHaveBeenCalledWith(expect.stringContaining('backups/db_backup_'), mockBytes, 'application/sql');
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'success'"), expect.any(Array));
        expect(fs.unlinkSync).toHaveBeenCalled();
    });
    it('handles backup failure and enqueues alert email', async () => {
        process.env.DATABASE_URL = 'postgres://localhost/test';
        process.env.ADMIN_EMAIL = 'admin@example.com';
        const mockDb = {
            query: vi.fn().mockResolvedValue({
                rows: [{ id: 'backup-job-2' }],
            }),
        };
        const mockContext = {
            logger: {
                info: vi.fn(),
                error: vi.fn(),
            },
            db: mockDb,
        };
        vi.mocked(execFileSync).mockImplementation(() => {
            throw new Error('pg_dump failed');
        });
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const queueInstanceMock = {
            add: vi.fn(),
            close: vi.fn(),
        };
        vi.mocked(Queue).mockImplementation(() => queueInstanceMock);
        await expect(processDbBackup({}, mockContext)).rejects.toThrow('pg_dump failed');
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'failed'"), expect.any(Array));
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(Queue).toHaveBeenCalledWith('email', expect.any(Object));
        expect(queueInstanceMock.add).toHaveBeenCalledWith('sla-warning', {
            to: 'admin@example.com',
            templateName: 'sla-warning',
            templateData: {
                title: 'Database Backup Failure Alert',
                message: expect.stringContaining('The scheduled database backup failed at'),
            },
        });
        expect(queueInstanceMock.close).toHaveBeenCalled();
    });
});
//# sourceMappingURL=db-backup.test.js.map