export declare function deactivate(userId: string, password: string, reason: string | null): Promise<void>;
export declare function reactivate(userId: string): Promise<void>;
export interface DeletionResult {
    status: 'completed' | 'pending';
    activeDealCount: number;
}
export declare function requestDeletion(userId: string, password: string, reason: string | null): Promise<DeletionResult>;
//# sourceMappingURL=account.service.d.ts.map