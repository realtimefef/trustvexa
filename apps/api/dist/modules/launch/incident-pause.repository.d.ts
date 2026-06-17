import type { IncidentPause, PauseScope } from './emergency-pause.js';
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export declare function startPause(tx: TxClient, input: {
    scope: PauseScope;
    chain: string | null;
    reason: string;
    startedBy: string;
}): Promise<string>;
export declare function endPause(tx: TxClient, id: string, endedBy: string): Promise<void>;
export declare function listActivePauses(tx: TxClient): Promise<IncidentPause[]>;
//# sourceMappingURL=incident-pause.repository.d.ts.map