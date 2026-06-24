import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as svc from './admin-extra.service.js';
function requestId(req) {
    return req.requestId ?? 'unknown';
}
function optionalString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
// ── Legal holds ──────────────────────────────────────────────────────────────
export async function listLegalHolds(req, res) {
    requireUserId(req);
    res.status(200).json(await svc.listLegalHolds());
}
export async function placeLegalHold(req, res) {
    const actorId = requireUserId(req);
    const body = req.body;
    res.status(201).json(await svc.placeLegalHold({
        actorId, targetType: body.targetType, targetId: body.targetId, reason: body.reason, requestId: requestId(req),
    }));
}
export async function releaseLegalHold(req, res) {
    const actorId = requireUserId(req);
    const holdId = requireParam(req, 'holdId');
    const body = req.body;
    res.status(200).json(await svc.releaseLegalHold({ actorId, holdId, reason: body.reason, requestId: requestId(req) }));
}
// ── Appeals ──────────────────────────────────────────────────────────────────
export async function listAppeals(req, res) {
    requireUserId(req);
    res.status(200).json(await svc.listAppeals(optionalString(req.query.status)));
}
export async function decideAppeal(req, res) {
    const actorId = requireUserId(req);
    const appealId = requireParam(req, 'appealId');
    const body = req.body;
    res.status(200).json(await svc.decideAppeal({
        actorId, appealId, decision: body.decision, decisionReason: body.decisionReason, requestId: requestId(req),
    }));
}
// ── AML alerts ───────────────────────────────────────────────────────────────
export async function listAmlAlerts(req, res) {
    requireUserId(req);
    const q = req.query;
    const dealId = optionalString(q.dealId);
    if (dealId) {
        res.status(200).json(await svc.listAmlAlertsForDeal(dealId));
        return;
    }
    res.status(200).json(await svc.listAmlAlerts(optionalString(q.status)));
}
export async function updateAmlAlert(req, res) {
    const actorId = requireUserId(req);
    const alertId = requireParam(req, 'alertId');
    const body = req.body;
    res.status(200).json(await svc.updateAmlAlert({ actorId, alertId, status: body.status, requestId: requestId(req) }));
}
// ── Break-glass ──────────────────────────────────────────────────────────────
export async function listBreakGlass(req, res) {
    requireUserId(req);
    res.status(200).json(await svc.listBreakGlass());
}
export async function recordBreakGlass(req, res) {
    const actorId = requireUserId(req);
    const body = req.body;
    res.status(201).json(await svc.recordBreakGlass({
        actorId, actorLabel: body.actorLabel, action: body.action, reason: body.reason, requestId: requestId(req),
    }));
}
// ── PII access ───────────────────────────────────────────────────────────────
export async function lookupUserPii(req, res) {
    const actorId = requireUserId(req);
    const targetUserId = requireParam(req, 'userId');
    const body = req.body;
    res.status(200).json(await svc.lookupUserPii({ actorId, targetUserId, fields: body.fields, reason: body.reason }));
}
export async function listPiiAccessLogs(req, res) {
    requireUserId(req);
    res.status(200).json(await svc.listPiiAccessLogs(optionalString(req.query.userId)));
}
// ── Withdrawal allowlist ─────────────────────────────────────────────────────
export async function listWithdrawalAllowlist(req, res) {
    requireUserId(req);
    res.status(200).json(await svc.listWithdrawalAllowlist());
}
export async function addWithdrawalAllowlist(req, res) {
    const actorId = requireUserId(req);
    const body = req.body;
    res.status(201).json(await svc.addWithdrawalAllowlist({
        actorId, coin: body.coin, network: body.network, address: body.address,
        label: body.label ?? null, delayHours: body.delayHours ?? 24, requestId: requestId(req),
    }));
}
export async function setWithdrawalAllowlistActive(req, res) {
    const actorId = requireUserId(req);
    const id = requireParam(req, 'id');
    const body = req.body;
    res.status(200).json(await svc.setWithdrawalAllowlistActive({ actorId, id, isActive: body.isActive, requestId: requestId(req) }));
}
//# sourceMappingURL=admin-extra.controller.js.map