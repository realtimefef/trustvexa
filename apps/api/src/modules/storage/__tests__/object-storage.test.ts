import { afterEach, describe, expect, it } from 'vitest';

import { documentKey, getObjectStorage, resetObjectStorageCache } from '../object-storage.js';

afterEach(() => {
  resetObjectStorageCache();
  delete process.env.S3_ENDPOINT;
  delete process.env.S3_BUCKET;
  delete process.env.S3_ACCESS_KEY_ID;
  delete process.env.S3_SECRET_ACCESS_KEY;
});

describe('documentKey', () => {
  it('builds a deterministic, PII-free key', () => {
    expect(documentKey('deal-1', 'dispute-decision', 'disp-9')).toBe(
      'documents/dispute-decision/deal-1/disp-9.pdf',
    );
  });
});

import * as fs from 'fs';
import * as path from 'path';

describe('getObjectStorage (unconfigured)', () => {
  it('reports not configured and falls back to local storage put without S3 env', async () => {
    const storage = getObjectStorage();
    expect(storage.configured).toBe(false);
    const result = await storage.put('documents/x/y.pdf', Buffer.from('hi'), 'application/pdf');
    expect(result).toEqual({ stored: true, key: 'documents/x/y.pdf' });

    // Clean up
    const filePath = path.resolve(process.cwd(), 'uploads/documents/x/y.pdf');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
});

describe('getObjectStorage (configured)', () => {
  it('reports configured when all S3 secrets are present', () => {
    process.env.S3_ENDPOINT = 'https://example.com';
    process.env.S3_BUCKET = 'docs';
    process.env.S3_ACCESS_KEY_ID = 'ak';
    process.env.S3_SECRET_ACCESS_KEY = 'sk';
    resetObjectStorageCache();
    expect(getObjectStorage().configured).toBe(true);
  });
});
