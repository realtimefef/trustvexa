/**
 * Risk/enforcement panel service (task 7.3). Builds an operator risk summary
 * for a deal assigned to the middleman by combining persisted risk flags with
 * the pure `buildRiskPanel` aggregator, and exposes the catalog of
 * change-controlled critical settings. The settings-change apply/cooldown/
 * rollback write pipeline is implemented in `enforcement.ts` but is not yet
 * wired to an HTTP route. (Requirements 39.x, 34.1-34.5)
 */
import { notFound } from '../../errors/app-error.js';
import {
  buildRiskPanel,
  CRITICAL_SETTING_KEYS,
  type RiskFlag,
  type RiskPanel,
  type RiskSeverity,
} from '../dashboard/enforcement.js';
import { getAssignedDeal, listRiskFlags } from './risk-read.repository.js';

const SEVERITIES = new Set<RiskSeverity>(['low', 'medium', 'high', 'critical']);

function normalizeSeverity(value: string | null): RiskSeverity {
  return value !== null && SEVERITIES.has(value as RiskSeverity) ? (value as RiskSeverity) : 'low';
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export interface RiskFlagView {
  id: string;
  flagType: string;
  severity: RiskSeverity;
  details: string | null;
  createdAt: string;
}

export interface RiskPanelView {
  dealId: string;
  dealRiskScore: number | null;
  panel: RiskPanel;
  flags: RiskFlagView[];
}

export async function getRiskPanel(middlemanId: string, dealId: string): Promise<RiskPanelView> {
  const deal = await getAssignedDeal(dealId, middlemanId);
  if (deal === null) {
    throw notFound('Deal was not found.');
  }
  const rows = await listRiskFlags(dealId);
  const flags: RiskFlag[] = rows.map((r) => ({
    flagType: r.flag_type,
    severity: normalizeSeverity(r.severity),
  }));
  return {
    dealId,
    dealRiskScore: deal.risk_score,
    panel: buildRiskPanel(flags),
    flags: rows.map((r) => ({
      id: r.id,
      flagType: r.flag_type,
      severity: normalizeSeverity(r.severity),
      details: r.details,
      createdAt: toIso(r.created_at),
    })),
  };
}

export function getCriticalSettings(): { keys: readonly string[] } {
  return { keys: CRITICAL_SETTING_KEYS };
}
