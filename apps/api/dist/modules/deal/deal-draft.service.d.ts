import type { DraftData, SaveDraftInput } from './deal.schemas.js';
export interface DraftSummary {
    id: string;
    lastStep: string | null;
    updatedAt: string;
    createdAt: string;
}
export interface DraftDetail extends DraftSummary {
    data: DraftData;
}
/** Create a new draft, or update an existing one the user owns. */
export declare function saveDraft(userId: string, input: SaveDraftInput): Promise<DraftSummary>;
export declare function listDrafts(userId: string): Promise<DraftSummary[]>;
export declare function getDraft(userId: string, draftId: string): Promise<DraftDetail>;
export declare function deleteDraft(userId: string, draftId: string): Promise<void>;
//# sourceMappingURL=deal-draft.service.d.ts.map