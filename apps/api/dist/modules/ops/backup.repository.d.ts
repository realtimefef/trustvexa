export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export type BackupType = 'postgres' | 'object_storage' | 'restore_test';
export type BackupStatus = 'running' | 'succeeded' | 'failed';
export interface BackupJobRow {
    id: string;
    backup_type: BackupType;
    status: BackupStatus;
    storage_location: string | null;
    started_at: string;
    completed_at: string | null;
}
export declare function startBackup(tx: TxClient, input: {
    backupType: BackupType;
    storageLocation: string | null;
}): Promise<string>;
export declare function completeBackup(tx: TxClient, id: string, status: Exclude<BackupStatus, 'running'>): Promise<void>;
export declare function lastSuccessfulBackup(tx: TxClient, backupType: BackupType): Promise<BackupJobRow | null>;
//# sourceMappingURL=backup.repository.d.ts.map