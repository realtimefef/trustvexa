/**
 * Middleman/admin console service (task 7.2). Composes the read-side rows with
 * the pure action-center logic so each queued deal carries the middleman's
 * next actions and a waiting-on-you flag, plus a small queue summary. Open
 * disputes are surfaced for triage. The caller's identity always comes from the
 * verified JWT; role enforcement happens in the route chain. (Requirements
 * 34.x, 48.5)
 */
import { isWaitingOn, nextActionsFor } from '../dashboard/action-center.js';
import type { NextAction } from '../dashboard/action-center.js';
import type { DealStatus } from '../deal/state-machine.js';
import {
  listMiddlemanQueue,
  listOpenDisputesForMiddleman,
  type AdminDisputeRow,
  type MiddlemanDealRow,
} from './admin-read.repository.js';

export interface QueueItem {
  id: string;
  status: DealStatus;
  riskScore: number | null;
  dealAmountCents: string | null;
  coin: string;
  network: string;
  isPractice: boolean;
  holdStatus: string | null;
  lastActivityAt: string | null;
  fundBy: string | null;
  completeBy: string | null;
  nextActions: readonly NextAction[];
  waitingOnMiddleman: boolean;
}

export interface QueueSummary {
  total: number;
  waiting: number;
  onHold: number;
}

export interface AdminDispute {
  id: string;
  dealId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  dealStatus: DealStatus;
  coin: string;
  network: string;
}

/** Normalize a pg timestamp (Date or string) to an ISO string, or `null`. */
function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toQueueItem(row: MiddlemanDealRow): QueueItem {
  return {
    id: row.id,
    status: row.status,
    riskScore: row.risk_score,
    dealAmountCents: row.deal_amount,
    coin: row.coin,
    network: row.network,
    isPractice: row.is_practice,
    holdStatus: row.hold_status,
    lastActivityAt: toIso(row.last_activity_at),
    fundBy: toIso(row.fund_by),
    completeBy: toIso(row.complete_by),
    nextActions: nextActionsFor('middleman', row.status),
    waitingOnMiddleman: isWaitingOn('middleman', row.status),
  };
}

/** The middleman's work queue: assigned deals, waiting-on-you first. */
export async function getMiddlemanQueue(
  userId: string,
): Promise<{ items: QueueItem[]; summary: QueueSummary }> {
  const rows = await listMiddlemanQueue(userId);
  const items = rows.map(toQueueItem);
  // Stable sort keeps the SQL recency order within each waiting group.
  items.sort((a, b) => Number(b.waitingOnMiddleman) - Number(a.waitingOnMiddleman));
  const summary: QueueSummary = {
    total: items.length,
    waiting: items.filter((item) => item.waitingOnMiddleman).length,
    onHold: items.filter((item) => item.holdStatus !== null && item.holdStatus !== '').length,
  };
  return { items, summary };
}

/** Open / under-review disputes the middleman needs to triage. */
export async function getOpenDisputes(userId: string): Promise<{ disputes: AdminDispute[] }> {
  const rows = await listOpenDisputesForMiddleman(userId);
  const disputes = rows.map((row: AdminDisputeRow) => ({
    id: row.id,
    dealId: row.deal_id,
    reason: row.reason,
    status: row.status,
    createdAt: toIso(row.created_at) ?? '',
    dealStatus: row.deal_status,
    coin: row.coin,
    network: row.network,
  }));
  return { disputes };
}
