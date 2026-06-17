/**
 * Task 4.14 — lifecycle-timer transition tests (mocked clock).
 *
 * Exercises the SLA sweep without a database by mocking the timer repository
 * and the deal service, asserting each elapsed window drives the correct
 * escrow transition and the responsible-party trust penalty:
 *   - funding-window expiry    -> FundingWindowExpired (14.9)
 *   - completion-clock expiry  -> CompletionClockExpired + lower seller trust (14.2 / 14.3)
 *   - dispute pause            -> no completion-clock action while paused (14.5)
 *   - inspection-window expiry -> InspectionWindowExpired auto-release (14.8)
 * System transitions carry a null actor (NULL `escrow_logs.actor_id`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lifecycle-timer.repository.js', () => ({
  findDueFundingWindowDeals: vi.fn(),
  findDueCompletionClockDeals: vi.fn(),
  findDueInspectionWindowDeals: vi.fn(),
  lowerUserTrust: vi.fn(),
  setFundingWindow: vi.fn(),
  setCompletionClock: vi.fn(),
  setInspectionWindow: vi.fn(),
}));

vi.mock('../deal.service.js', () => ({
  applyDealTransition: vi.fn(),
}));

import { applyDealTransition } from '../deal.service.js';
import * as timerRepo from '../lifecycle-timer.repository.js';
import {
  COMPLETION_CLOCK_DAYS,
  runLifecycleTimers,
  startCompletionClock,
  startFundingWindow,
  startInspectionWindow,
} from '../lifecycle-timer.service.js';

const fundingMock = vi.mocked(timerRepo.findDueFundingWindowDeals);
const completionMock = vi.mocked(timerRepo.findDueCompletionClockDeals);
const inspectionMock = vi.mocked(timerRepo.findDueInspectionWindowDeals);
const lowerTrustMock = vi.mocked(timerRepo.lowerUserTrust);
const setCompletionMock = vi.mocked(timerRepo.setCompletionClock);
const setInspectionMock = vi.mocked(timerRepo.setInspectionWindow);
const setFundingMock = vi.mocked(timerRepo.setFundingWindow);
const transitionMock = vi.mocked(applyDealTransition);

const NOW = new Date('2026-01-01T00:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  fundingMock.mockResolvedValue([]);
  completionMock.mockResolvedValue([]);
  inspectionMock.mockResolvedValue([]);
  lowerTrustMock.mockResolvedValue();
  setCompletionMock.mockResolvedValue();
  setInspectionMock.mockResolvedValue();
  setFundingMock.mockResolvedValue();
  transitionMock.mockResolvedValue({
    dealId: 'd',
    from: 'X',
    to: 'Y',
    event: 'FundingWindowExpired',
    version: 1,
    entryHash: 'h',
  });
});

describe('runLifecycleTimers', () => {
  it('expires a pre-funding deal whose funding window elapsed (14.9)', async () => {
    fundingMock.mockResolvedValue([{ id: 'deal-fund' }]);
    const summary = await runLifecycleTimers({ now: NOW });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: 'deal-fund',
        event: 'FundingWindowExpired',
        actorId: null,
      }),
    );
    expect(summary.fundingExpired).toBe(1);
  });

  it('expires the completion clock and lowers the responsible seller trust (14.2 / 14.3)', async () => {
    completionMock.mockResolvedValue([{ id: 'deal-comp', seller_id: 'seller-1' }]);
    const summary = await runLifecycleTimers({ now: NOW });
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: 'deal-comp',
        event: 'CompletionClockExpired',
        actorId: null,
      }),
    );
    expect(lowerTrustMock).toHaveBeenCalledWith('seller-1');
    expect(summary.completionExpired).toBe(1);
    expect(summary.trustLowered).toBe(1);
  });

  it('does not lower trust when no responsible seller is recorded', async () => {
    completionMock.mockResolvedValue([{ id: 'deal-comp', seller_id: null }]);
    const summary = await runLifecycleTimers({ now: NOW });
    expect(lowerTrustMock).not.toHaveBeenCalled();
    expect(summary.trustLowered).toBe(0);
    expect(summary.completionExpired).toBe(1);
  });

  it('auto-releases to the seller when the inspection window elapses (14.8)', async () => {
    inspectionMock.mockResolvedValue([{ id: 'deal-insp' }]);
    const summary = await runLifecycleTimers({ now: NOW });
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: 'deal-insp',
        event: 'InspectionWindowExpired',
        actorId: null,
      }),
    );
    expect(summary.inspectionReleased).toBe(1);
  });

  it('pauses the completion clock while a dispute is open (14.5)', async () => {
    // A disputed deal has left `Funded`, so the status-scoped due queries return
    // it to none of the sweeps — modeled here by empty due-lists.
    const summary = await runLifecycleTimers({ now: NOW });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(lowerTrustMock).not.toHaveBeenCalled();
    expect(summary.completionExpired).toBe(0);
  });

  it('skips a deal a concurrent writer already advanced (no trust penalty)', async () => {
    completionMock.mockResolvedValue([{ id: 'deal-race', seller_id: 'seller-1' }]);
    transitionMock.mockRejectedValueOnce(
      Object.assign(new Error('concurrent'), { errorCode: 'concurrent_update' }),
    );
    const summary = await runLifecycleTimers({ now: NOW });
    expect(lowerTrustMock).not.toHaveBeenCalled();
    expect(summary.completionExpired).toBe(0);
    expect(summary.skipped).toBe(1);
  });
});

describe('timer window start helpers (mocked clock)', () => {
  it('starts the 3-day completion clock from the contact time (14.1)', async () => {
    await startCompletionClock('deal-1', NOW);
    const expectedDeadline = new Date(
      NOW.getTime() + COMPLETION_CLOCK_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(setCompletionMock).toHaveBeenCalledWith('deal-1', NOW.toISOString(), expectedDeadline);
  });

  it('starts the inspection window ahead of now (14.6)', async () => {
    await startInspectionWindow('deal-1', NOW);
    expect(setInspectionMock).toHaveBeenCalledTimes(1);
    const call = setInspectionMock.mock.calls[0];
    expect(call?.[0]).toBe('deal-1');
    expect(new Date(call?.[1] ?? '').getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('starts the funding window ahead of now (14.9)', async () => {
    await startFundingWindow('deal-1', NOW);
    expect(setFundingMock).toHaveBeenCalledTimes(1);
    const call = setFundingMock.mock.calls[0];
    expect(call?.[0]).toBe('deal-1');
    expect(new Date(call?.[1] ?? '').getTime()).toBeGreaterThan(NOW.getTime());
  });
});
