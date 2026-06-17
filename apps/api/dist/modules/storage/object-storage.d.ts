export interface PutResult {
    /** True when the bytes were durably written to the object store. */
    readonly stored: boolean;
    /** The key the object was (or would be) stored under. */
    readonly key: string;
}
export interface ObjectStorage {
    /** True when an S3-compatible backend is configured. */
    readonly configured: boolean;
    /** Persist bytes under `key`. */
    put(key: string, bytes: Buffer, contentType: string): Promise<PutResult>;
    /** Retrieve bytes under `key`. */
    get(key: string): Promise<Buffer | null>;
}
/** Deterministic object key for a deal document (no PII in the path). */
export declare function documentKey(dealId: string, kind: string, id: string): string;
/** Return the process-wide object storage, creating it lazily on first use. */
export declare function getObjectStorage(): ObjectStorage;
/** Test helper: reset the memoized storage instance. */
export declare function resetObjectStorageCache(): void;
//# sourceMappingURL=object-storage.d.ts.map