/**
 * Extended middleman/admin operations service (Plan §25/§33/§4).
 *
 * Read views (deal/user search, analytics, holds, overrides, notes, pauses,
 * flags) project the persisted rows into stable, camelCase view objects.
 *
 * Every audited write runs inside a single transaction together with a
 * hash-chained `admin_actions` row via the shared `appendAdminAction`, so the
 * mutation and its tamper-evident audit entry commit atomically. Each write is
 * idempotent: a repeated request reuses the existing row instead of creating a
 * duplicate. The route chain restricts these endpoints to the `middleman` role
 * and enforces an Idempotency-Key on every write.
 */
import { getClient } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { appendAdminAction } from './enforcement.repository.js';
import {} from '../launch/emergency-pause.js';
import * as repo from './admin-ops.repository.js';
async function inTransaction(work) {
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/** Normalize a pg timestamp (Date or string) to an ISO string, or `null`. */
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function searchDeals(filters) {
    const repoFilters = { limit: filters.limit ?? 50 };
    if (filters.status !== undefined)
        repoFilters.status = filters.status;
    if (filters.risk !== undefined)
        repoFilters.minRisk = filters.risk;
    if (filters.q !== undefined)
        repoFilters.q = filters.q;
    const rows = await repo.searchDeals(repoFilters);
    const deals = rows.map((row) => ({
        id: row.id,
        status: row.status,
        riskScore: row.risk_score,
        dealAmountCents: row.deal_amount,
        coin: row.coin,
        network: row.network,
        isPractice: row.is_practice,
        holdStatus: row.hold_status,
        legalHold: row.legal_hold,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        middlemanId: row.middleman_id,
        archived: row.archived,
        lastActivityAt: toIso(row.last_activity_at),
        createdAt: toIso(row.created_at),
    }));
    return { deals };
}
export async function searchUsers(filters) {
    const repoFilters = { limit: filters.limit ?? 50 };
    if (filters.q !== undefined)
        repoFilters.q = filters.q;
    if (filters.status !== undefined)
        repoFilters.status = filters.status;
    if (filters.label !== undefined)
        repoFilters.label = filters.label;
    const rows = await repo.searchUsers(repoFilters);
    const users = rows.map((row) => ({
        id: row.id,
        username: row.username,
        accountType: row.account_type,
        accountStatus: row.account_status,
        accountLabel: row.account_label,
        trustLevel: row.trust_level,
        legalHold: row.legal_hold,
        dealsCount: row.deals_count,
        createdAt: toIso(row.created_at),
    }));
    return { users, total: users.length };
}
// ── Analytics ─────────────────────────────────────────────────────────────────
export async function getAnalytics() {
    const [analytics, fraudAnalytics] = await Promise.all([
        repo.getLatestAnalyticsSnapshot(),
        repo.getLatestFraudAnalyticsSnapshot(),
    ]);
    return { analytics, fraudAnalytics };
}
function toHoldView(row) {
    return {
        id: row.id,
        dealId: row.deal_id,
        holdType: row.hold_type,
        reason: row.reason,
        visibleMessage: row.visible_message,
        userNextAction: row.user_next_action,
        estimatedNextStepAt: toIso(row.estimated_next_step_at),
        startedBy: row.started_by,
        releasedBy: row.released_by,
        createdAt: toIso(row.created_at),
    };
}
export async function listHolds() {
    const rows = await repo.listActiveHolds(200);
    return { holds: rows.map(toHoldView) };
}
/** Place a manual review hold (idempotent on an active hold of the same type). */
export async function placeHold(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.findActiveHold(tx, input.dealId, input.holdType);
        if (existing) {
            return { hold: toHoldView(existing), alreadyOnHold: true };
        }
        const hold = await repo.insertHold(tx, {
            dealId: input.dealId,
            holdType: input.holdType,
            reason: input.reason,
            visibleMessage: input.visibleMessage,
            startedBy: input.actorId,
        });
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'place_hold',
            targetType: 'deal',
            targetId: input.dealId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { holdId: hold.id, holdType: input.holdType },
        });
        return { hold: toHoldView(hold), alreadyOnHold: false };
    });
}
/** Release a hold (idempotent; releasing an already-released hold is a no-op). */
export async function releaseHold(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.getHoldById(tx, input.holdId);
        if (!existing) {
            throw notFound('Hold was not found.');
        }
        if (existing.released_by !== null) {
            return { hold: toHoldView(existing), alreadyReleased: true };
        }
        const released = await repo.releaseHold(tx, input.holdId, input.actorId);
        if (!released) {
            throw new AppError('release_conflict', 'The hold could not be released.', 409);
        }
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'release_hold',
            targetType: 'deal',
            targetId: released.deal_id,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { holdId: released.id, holdType: released.hold_type },
        });
        return { hold: toHoldView(released), alreadyReleased: false };
    });
}
function toOverrideView(row) {
    return {
        id: row.id,
        actorId: row.actor_id,
        dealId: row.deal_id,
        overrideType: row.override_type,
        oldValue: row.old_value,
        newValue: row.new_value,
        reason: row.reason,
        confirmedAt: toIso(row.confirmed_at),
        createdAt: toIso(row.created_at),
    };
}
export async function listOverrides(dealId) {
    const rows = await repo.listOverrides(dealId);
    return { overrides: rows.map(toOverrideView) };
}
/** Record a controlled manual override (idempotent on an identical correction). */
export async function recordOverride(input) {
    if (!input.confirmed) {
        throw new AppError('confirmation_required', 'An override must be explicitly confirmed.', 422);
    }
    return inTransaction(async (tx) => {
        const existing = await repo.findOverride(tx, {
            dealId: input.dealId,
            overrideType: input.overrideType,
            oldValue: input.oldValue,
            newValue: input.newValue,
        });
        if (existing) {
            return { override: toOverrideView(existing), alreadyRecorded: true };
        }
        const override = await repo.insertOverride(tx, {
            actorId: input.actorId,
            dealId: input.dealId,
            overrideType: input.overrideType,
            oldValue: input.oldValue,
            newValue: input.newValue,
            reason: input.reason,
        });
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'record_override',
            targetType: 'deal',
            targetId: input.dealId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: {
                overrideId: override.id,
                overrideType: input.overrideType,
                oldValue: input.oldValue,
                newValue: input.newValue,
            },
        });
        return { override: toOverrideView(override), alreadyRecorded: false };
    });
}
function toNoteView(row) {
    return {
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        note: row.note_enc,
        createdBy: row.created_by,
        createdAt: toIso(row.created_at),
    };
}
export async function listNotes(targetType, targetId) {
    const rows = await repo.listNotes(targetType, targetId);
    return { notes: rows.map(toNoteView) };
}
/** Add a private admin note (idempotent on identical content by the same author). */
export async function addNote(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.findNote(tx, {
            targetType: input.targetType,
            targetId: input.targetId,
            noteEnc: input.note,
            createdBy: input.actorId,
        });
        if (existing) {
            return { note: toNoteView(existing), alreadyExists: true };
        }
        const note = await repo.insertNote(tx, {
            targetType: input.targetType,
            targetId: input.targetId,
            noteEnc: input.note,
            createdBy: input.actorId,
        });
        return { note: toNoteView(note), alreadyExists: false };
    });
}
function toPauseView(row) {
    return {
        id: row.id,
        scope: row.scope,
        reason: row.reason,
        startedBy: row.started_by,
        startedAt: toIso(row.started_at),
        endedBy: row.ended_by,
        endedAt: toIso(row.ended_at),
    };
}
export async function listPauses() {
    const rows = await repo.listActivePauses();
    return { pauses: rows.map(toPauseView) };
}
/** Start an emergency pause (idempotent on an already-active pause for the scope). */
export async function startPause(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.findActivePauseByScope(tx, input.scope);
        if (existing) {
            return { pause: toPauseView(existing), alreadyActive: true };
        }
        const pause = await repo.insertPause(tx, {
            scope: input.scope,
            reason: input.reason,
            startedBy: input.actorId,
        });
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'start_pause',
            targetType: 'incident_pause',
            targetId: pause.id,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { scope: input.scope },
        });
        return { pause: toPauseView(pause), alreadyActive: false };
    });
}
/** End a pause (idempotent; ending an already-ended pause is a no-op). */
export async function endPause(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.getPauseById(tx, input.pauseId);
        if (!existing) {
            throw notFound('Incident pause was not found.');
        }
        if (existing.ended_at !== null) {
            return { pause: toPauseView(existing), alreadyEnded: true };
        }
        const ended = await repo.endPauseById(tx, input.pauseId, input.actorId);
        if (!ended) {
            throw new AppError('end_pause_conflict', 'The pause could not be ended.', 409);
        }
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'end_pause',
            targetType: 'incident_pause',
            targetId: ended.id,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { scope: ended.scope },
        });
        return { pause: toPauseView(ended), alreadyEnded: false };
    });
}
function toFlagView(row) {
    return {
        flagKey: row.flag_key,
        description: row.description,
        isEnabled: row.is_enabled,
        scope: row.scope,
        updatedBy: row.updated_by,
        createdAt: toIso(row.created_at),
    };
}
export async function listFeatureFlags() {
    const rows = await repo.listFeatureFlags();
    return { flags: rows.map(toFlagView) };
}
/** Toggle a feature flag's enabled state (audited). 404 when the flag is unknown. */
export async function toggleFeatureFlag(input) {
    return inTransaction(async (tx) => {
        const existing = await repo.getFeatureFlag(tx, input.key);
        if (!existing) {
            throw notFound('Feature flag was not found.');
        }
        const updated = await repo.updateFeatureFlag(tx, {
            key: input.key,
            isEnabled: input.isEnabled,
            updatedBy: input.actorId,
        });
        if (!updated) {
            throw new AppError('flag_update_conflict', 'The feature flag could not be updated.', 409);
        }
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'toggle_feature_flag',
            targetType: 'feature_flag',
            targetId: existing.id, // use the row's UUID, not the text key
            reason: input.reason,
            requestId: input.requestId,
            metadata: { key: input.key, from: existing.is_enabled, to: input.isEnabled },
        });
        return { flag: toFlagView(updated) };
    });
}
export async function getAuditLog() {
    const rows = await repo.listAuditLogs(100);
    return {
        auditLog: rows.map((row) => ({
            id: row.id,
            actorId: row.actor_id,
            action: row.action,
            targetType: row.target_type,
            targetId: row.target_id,
            reason: row.reason,
            requiresConfirmation: !!row.requires_confirmation,
            requestId: row.request_id,
            metadata: row.metadata || {},
            prevHash: row.prev_hash,
            entryHash: row.entry_hash,
            createdAt: toIso(row.created_at) ?? '',
        })),
    };
}
export async function createAnnouncement(input) {
    return inTransaction(async (tx) => {
        const announcement = await repo.insertAnnouncement(tx, {
            title: input.title,
            body: input.body,
            audience: input.audience,
            startsAt: input.startsAt ? new Date(input.startsAt) : null,
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
        });
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'create_announcement',
            targetType: 'announcement',
            targetId: announcement.id,
            reason: `Announcement created for audience: ${input.audience}`,
            requestId: input.requestId,
            metadata: { title: input.title, audience: input.audience },
        });
        return {
            announcement: {
                id: announcement.id,
                title: announcement.title,
                body: announcement.body,
                audience: announcement.audience,
                startsAt: toIso(announcement.starts_at),
                endsAt: toIso(announcement.ends_at),
                createdAt: toIso(announcement.created_at),
            },
        };
    });
}
export async function searchChats(limit) {
    const rows = await repo.searchChats(limit ?? 50);
    const chats = rows.map((row) => ({
        id: row.id,
        dealId: row.deal_id,
        type: row.type,
        status: row.status,
        createdAt: toIso(row.created_at),
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        middlemanId: row.middleman_id,
    }));
    return { chats };
}
export async function deleteChat(input) {
    return inTransaction(async (tx) => {
        const ok = await repo.deleteChat(tx, input.chatId);
        if (!ok) {
            throw notFound('Chat was not found.');
        }
        await appendAdminAction(tx, {
            actorId: input.actorId,
            action: 'delete_chat',
            targetType: 'chat',
            targetId: input.chatId,
            reason: input.reason,
            requestId: input.requestId,
            metadata: { chatId: input.chatId },
        });
        return { success: true };
    });
}
//# sourceMappingURL=admin-ops.service.js.map