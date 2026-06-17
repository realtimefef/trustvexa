import express, {} from 'express';
/**
 * Middleware slot 4 — Body parse.
 *
 * Parses JSON request bodies (the API speaks JSON per Requirement 44.1). A
 * conservative size limit guards against oversized payloads. (Requirement 44.3
 * slot 4)
 */
export function bodyParse() {
    return express.json({ limit: '1mb' });
}
//# sourceMappingURL=body-parse.js.map