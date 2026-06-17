/**
 * Deal draft service (task 4.1, Requirement 8.6).
 *
 * Lets a user save a half-set-up deal and resume it later. Drafts are stored
 * per user and every read/write is scoped by `user_id`, so a user can only see
 * their own drafts.
 *
 * Encryption-at-rest: `deal_drafts.draft_data_enc` is sealed with `sealPii()`
 * on write and opened with `openPii()` on read. The KEK-backed KeyProvider is
 * fully wired. The draft schema is `.strict()` and carries deal SETTINGS only
 * (no counterparty identity), so no counterparty PII is stored in the draft.
 */
import { AppError, notFound } from '../../errors/app-error.js';
import { sealPii, openPii } from '../crypto/key-provider.js';
import { deleteDraft as deleteDraftRow, getDraft as getDraftRow, insertDraft, listDrafts as listDraftRows, updateDraft, } from './deal-creation.repository.js';
import { draftDataSchema } from './deal.schemas.js';
function encodeDraft(data) {
    return JSON.stringify(data);
}
function decodeDraft(raw) {
    if (raw === null || raw === '') {
        return {};
    }
    // Re-validate on the way out so a malformed/legacy blob cannot smuggle
    // unexpected fields back to the client.
    return draftDataSchema.parse(JSON.parse(raw));
}
/** Create a new draft, or update an existing one the user owns. */
export async function saveDraft(userId, input) {
    const dataEnc = await sealPii(encodeDraft(input.data));
    if (input.draftId !== undefined) {
        const updated = await updateDraft(userId, input.draftId, dataEnc, input.lastStep);
        if (updated === null) {
            throw new AppError('draft_not_found', 'Draft was not found or is not yours.', 404);
        }
        return toSummary(updated);
    }
    const created = await insertDraft(userId, dataEnc, input.lastStep);
    return toSummary(created);
}
export async function listDrafts(userId) {
    const rows = await listDraftRows(userId);
    return rows.map(toSummary);
}
export async function getDraft(userId, draftId) {
    const row = await getDraftRow(userId, draftId);
    if (row === null) {
        throw notFound('Draft was not found.');
    }
    const decrypted = await openPii(row.draft_data_enc);
    return {
        id: row.id,
        lastStep: row.last_step,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        data: decodeDraft(decrypted),
    };
}
export async function deleteDraft(userId, draftId) {
    const removed = await deleteDraftRow(userId, draftId);
    if (removed === 0) {
        throw notFound('Draft was not found.');
    }
}
function toSummary(row) {
    return {
        id: row.id,
        lastStep: row.last_step,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=deal-draft.service.js.map