import { describe, expect, it, vi } from 'vitest';

vi.mock('../deal.repository.js', () => ({
  acquireClient: vi.fn(),
}));

import { updateDealTags } from '../deal.service.js';
import * as repo from '../deal.repository.js';

describe('updateDealTags', () => {
  it('updates deal tags successfully when the user is a party', async () => {
    const mockQuery = vi.fn().mockImplementation((q) => {
      if (q.includes('SELECT 1 FROM deals')) {
        return { rows: [{ '1': 1 }] };
      }
      return { rows: [] };
    });
    const mockRelease = vi.fn();
    const mockClient = { query: mockQuery, release: mockRelease };
    vi.mocked(repo.acquireClient).mockResolvedValue(mockClient as any);

    await updateDealTags('user-1', 'deal-1', ['Urgent', 'Personal']);

    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT 1 FROM deals'), [
      'deal-1',
      'user-1',
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM deal_tags'), [
      'user-1',
      'deal-1',
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO deal_tags'), [
      'user-1',
      'deal-1',
      'Urgent',
    ]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO deal_tags'), [
      'user-1',
      'deal-1',
      'Personal',
    ]);
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('throws deal_not_found error when the user is not a party to the deal', async () => {
    const mockQuery = vi.fn().mockImplementation((q) => {
      if (q.includes('SELECT 1 FROM deals')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const mockRelease = vi.fn();
    const mockClient = { query: mockQuery, release: mockRelease };
    vi.mocked(repo.acquireClient).mockResolvedValue(mockClient as any);

    await expect(updateDealTags('user-1', 'deal-1', ['Urgent'])).rejects.toThrow(
      'Deal was not found',
    );
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });
});
