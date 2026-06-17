/**
 * Risk/enforcement panel service (task 7.3). Builds an operator risk summary
 * for a deal assigned to the middleman by combining persisted risk flags with
 * the pure `buildRiskPanel` aggregator, and exposes the catalog of
 * change-controlled critical settings. The settings-change apply/cooldown/
 * rollback write pipeline is implemented in `enforcement.ts` but is not yet
 * wired to an HTTP route. (Requirements 39.x, 34.1-34.5)
 */
import { notFound } from '../../errors/app-error.js';
import { buildRiskPanel, CRITICAL_SETTING_KEYS, } from '../dashboard/enforcement.js';
import { getAssignedDeal, listRiskFlags } from './risk-read.repository.js';
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
function normalizeSeverity(value) {
    return value !== null && SEVERITIES.has(value) ? value : 'low';
}
function toIso(value) {
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function getRiskPanel(middlemanId, dealId) {
    const deal = await getAssignedDeal(dealId, middlemanId);
    if (deal === null) {
        throw notFound('Deal was not found.');
    }
    const rows = await listRiskFlags(dealId);
    const flags = rows.map((r) => ({
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
export function getCriticalSettings() {
    return { keys: CRITICAL_SETTING_KEYS };
}
//# sourceMappingURL=risk.service.js.map