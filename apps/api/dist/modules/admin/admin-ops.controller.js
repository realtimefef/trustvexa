import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as ops from './admin-ops.service.js';
function requestId(req) {
    return req.requestId ?? 'unknown';
}
function optionalString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
// ── Search & analytics ─────────────────────────────────────────────────────
export async function searchDeals(req, res) {
    requireUserId(req);
    const q = req.query;
    const filters = {};
    const status = optionalString(q.status);
    if (status !== undefined)
        filters.status = status;
    const search = optionalString(q.q);
    if (search !== undefined)
        filters.q = search;
    const risk = q.risk !== undefined ? Number(q.risk) : NaN;
    if (Number.isFinite(risk))
        filters.risk = risk;
    res.status(200).json(await ops.searchDeals(filters));
}
export async function searchUsers(req, res) {
    requireUserId(req);
    const q = req.query;
    const filters = {};
    const search = optionalString(q.q);
    if (search !== undefined)
        filters.q = search;
    const status = optionalString(q.status);
    if (status !== undefined)
        filters.status = status;
    const label = optionalString(q.label);
    if (label !== undefined)
        filters.label = label;
    res.status(200).json(await ops.searchUsers(filters));
}
export async function getAnalytics(req, res) {
    requireUserId(req);
    res.status(200).json(await ops.getAnalytics());
}
// ── Holds ──────────────────────────────────────────────────────────────────
export async function listHolds(req, res) {
    requireUserId(req);
    res.status(200).json(await ops.listHolds());
}
export async function placeHold(req, res) {
    const actorId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const body = req.body;
    res.status(201).json(await ops.placeHold({
        actorId,
        dealId,
        holdType: body.holdType,
        reason: body.reason,
        visibleMessage: body.visibleMessage ?? null,
        requestId: requestId(req),
    }));
}
export async function releaseHold(req, res) {
    const actorId = requireUserId(req);
    const holdId = requireParam(req, 'holdId');
    const body = req.body;
    res
        .status(200)
        .json(await ops.releaseHold({ actorId, holdId, reason: body.reason, requestId: requestId(req) }));
}
// ── Overrides ────────────────────────────────────────────────────────────────
export async function listOverrides(req, res) {
    requireUserId(req);
    const dealId = optionalString(req.query.dealId);
    res.status(200).json(await ops.listOverrides(dealId));
}
export async function recordOverride(req, res) {
    const actorId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const body = req.body;
    res.status(201).json(await ops.recordOverride({
        actorId,
        dealId,
        overrideType: body.overrideType,
        oldValue: body.oldValue,
        newValue: body.newValue,
        reason: body.reason,
        confirmed: body.confirmed,
        requestId: requestId(req),
    }));
}
// ── Notes ──────────────────────────────────────────────────────────────────
export async function listNotes(req, res) {
    requireUserId(req);
    const targetType = requireParam(req, 'targetType');
    const targetId = requireParam(req, 'targetId');
    res.status(200).json(await ops.listNotes(targetType, targetId));
}
export async function addNote(req, res) {
    const actorId = requireUserId(req);
    const targetType = requireParam(req, 'targetType');
    const targetId = requireParam(req, 'targetId');
    const body = req.body;
    res.status(201).json(await ops.addNote({ actorId, targetType, targetId, note: body.note }));
}
// ── Emergency pauses ────────────────────────────────────────────────────────
export async function listPauses(req, res) {
    requireUserId(req);
    res.status(200).json(await ops.listPauses());
}
export async function startPause(req, res) {
    const actorId = requireUserId(req);
    const body = req.body;
    res.status(201).json(await ops.startPause({
        actorId,
        scope: body.scope,
        reason: body.reason,
        requestId: requestId(req),
    }));
}
export async function endPause(req, res) {
    const actorId = requireUserId(req);
    const pauseId = requireParam(req, 'pauseId');
    const body = (req.body ?? {});
    res.status(200).json(await ops.endPause({
        actorId,
        pauseId,
        reason: body.reason ?? 'ended by middleman',
        requestId: requestId(req),
    }));
}
// ── Feature flags ─────────────────────────────────────────────────────────────
export async function listFeatureFlags(req, res) {
    requireUserId(req);
    res.status(200).json(await ops.listFeatureFlags());
}
export async function toggleFeatureFlag(req, res) {
    const actorId = requireUserId(req);
    const key = requireParam(req, 'key');
    const body = req.body;
    res.status(200).json(await ops.toggleFeatureFlag({
        actorId,
        key,
        isEnabled: body.isEnabled,
        reason: body.reason ?? 'toggled by middleman',
        requestId: requestId(req),
    }));
}
export async function getAuditLog(req, res) {
    requireUserId(req);
    res.status(200).json(await ops.getAuditLog());
}
export async function createAnnouncement(req, res) {
    const actorId = requireUserId(req);
    const body = req.body;
    res.status(201).json(await ops.createAnnouncement({
        actorId,
        title: body.title,
        body: body.body,
        audience: body.audience,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
        requestId: requestId(req),
    }));
}
export async function searchChats(req, res) {
    requireUserId(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    res.status(200).json(await ops.searchChats(limit));
}
export async function deleteChat(req, res) {
    const actorId = requireUserId(req);
    const reqId = requestId(req);
    const chatId = requireParam(req, 'chatId');
    const body = req.body;
    if (!body.reason) {
        res.status(422).json({ error: 'A deletion reason is required.' });
        return;
    }
    res.status(200).json(await ops.deleteChat({
        actorId,
        chatId,
        reason: body.reason,
        requestId: reqId,
    }));
}
//# sourceMappingURL=admin-ops.controller.js.map