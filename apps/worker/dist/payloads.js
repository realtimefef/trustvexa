/**
 * Background-job payload contracts + defensive parsers.
 *
 * BullMQ delivers `job.data` as untyped JSON, so each queue's payload is parsed
 * and validated here before a processor runs. The worker has no Zod dependency,
 * so these are small hand-written guards that throw
 * {@link InvalidJobPayloadError} (a non-retryable, dead-letter-worthy error) on
 * malformed input. bigint money amounts travel as decimal strings to preserve
 * precision across the JSON boundary.
 *
 * The literal unions below (notification event types, dead-letter statuses) are
 * intentionally local copies of the domain unions: they are structurally
 * identical, so values flow into the API domain functions without coupling the
 * worker's payload layer to the API's internal module graph.
 */
export class InvalidJobPayloadError extends Error {
    constructor(message) {
        super(`invalid_job_payload:${message}`);
        this.name = 'InvalidJobPayloadError';
    }
}
function asRecord(data) {
    if (typeof data !== 'object' || data === null) {
        throw new InvalidJobPayloadError('payload must be a JSON object');
    }
    return data;
}
function reqString(record, key) {
    const value = record[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new InvalidJobPayloadError(`"${key}" must be a non-empty string`);
    }
    return value;
}
function optString(record, key) {
    const value = record[key];
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string') {
        throw new InvalidJobPayloadError(`"${key}" must be a string`);
    }
    return value;
}
function reqStringArray(record, key) {
    const value = record[key];
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        throw new InvalidJobPayloadError(`"${key}" must be a string[]`);
    }
    return value;
}
function reqBigint(record, key) {
    const value = record[key];
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new InvalidJobPayloadError(`"${key}" must be an integer string`);
    }
    try {
        return BigInt(value);
    }
    catch {
        throw new InvalidJobPayloadError(`"${key}" is not a valid integer`);
    }
}
function optBigint(record, key) {
    if (record[key] === undefined || record[key] === null)
        return undefined;
    return reqBigint(record, key);
}
function reqRecord(record, key) {
    return asRecord(record[key]);
}
function optRecord(record, key) {
    const value = record[key];
    if (value === undefined || value === null)
        return {};
    return asRecord(value);
}
function reqInt(record, key) {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new InvalidJobPayloadError(`"${key}" must be an integer`);
    }
    return value;
}
export function parseEmailJob(data) {
    const r = asRecord(data);
    const to = reqString(r, 'to');
    const templateName = optString(r, 'templateName');
    if (templateName) {
        return {
            to,
            templateName,
            templateData: optRecord(r, 'templateData'),
        };
    }
    const base = {
        to,
        subject: reqString(r, 'subject'),
        html: reqString(r, 'html'),
    };
    const text = optString(r, 'text');
    return text === undefined ? base : { ...base, text };
}
const NOTIFICATION_EVENT_TYPES = [
    'deal:update',
    'payment:received',
    'confirmation:update',
    'payout:update',
    'refund:update',
    'dispute:update',
    'chat:message',
    'sla:warning',
];
export function parseNotificationFanoutJob(data) {
    const r = asRecord(data);
    const eventType = reqString(r, 'eventType');
    if (!NOTIFICATION_EVENT_TYPES.includes(eventType)) {
        throw new InvalidJobPayloadError('"eventType" is not a known notification event');
    }
    const dealId = optString(r, 'dealId');
    return {
        eventType: eventType,
        dealId: dealId ?? null,
        recipientUserIds: reqStringArray(r, 'recipientUserIds'),
        payload: optRecord(r, 'payload'),
    };
}
export function parsePayoutProcessingJob(data) {
    const r = asRecord(data);
    const action = reqString(r, 'action');
    if (action !== 'broadcast' && action !== 'confirm') {
        throw new InvalidJobPayloadError('"action" must be broadcast|confirm');
    }
    const base = {
        payoutId: reqString(r, 'payoutId'),
        expectedVersion: reqInt(r, 'expectedVersion'),
        action,
        coin: reqString(r, 'coin'),
        network: reqString(r, 'network'),
        toAddress: reqString(r, 'toAddress'),
        amountSmallestUnit: reqBigint(r, 'amountSmallestUnit'),
    };
    const txHash = optString(r, 'txHash');
    return txHash === undefined ? base : { ...base, txHash };
}
export function parseMediaScanJob(data) {
    const r = asRecord(data);
    const base = {
        attachmentId: reqString(r, 'attachmentId'),
        storageKey: reqString(r, 'storageKey'),
    };
    const sha256 = optString(r, 'sha256');
    return sha256 === undefined ? base : { ...base, sha256 };
}
export function parseFxRefreshJob(data) {
    const r = asRecord(data);
    const base = {
        coin: reqString(r, 'coin'),
        fiat: reqString(r, 'fiat'),
    };
    const ref = r['referenceRate'];
    if (ref === undefined || ref === null)
        return base;
    if (typeof ref !== 'number' || !Number.isFinite(ref)) {
        throw new InvalidJobPayloadError('"referenceRate" must be a finite number');
    }
    return { ...base, referenceRate: ref };
}
export function parseReconciliationJob(data) {
    const r = asRecord(data);
    const snap = reqRecord(r, 'snapshot');
    const job = {
        coin: reqString(r, 'coin'),
        network: reqString(r, 'network'),
        ledgerBalance: reqBigint(r, 'ledgerBalance'),
        onchainBalance: reqBigint(r, 'onchainBalance'),
        snapshot: {
            heldInEscrow: reqBigint(snap, 'heldInEscrow'),
            owedToSellers: reqBigint(snap, 'owedToSellers'),
            refundsOwed: reqBigint(snap, 'refundsOwed'),
            platformFeeRevenue: reqBigint(snap, 'platformFeeRevenue'),
            gasSpent: reqBigint(snap, 'gasSpent'),
            hotBalance: reqBigint(snap, 'hotBalance'),
            coldBalance: reqBigint(snap, 'coldBalance'),
        },
    };
    const tol = optBigint(r, 'toleranceUnits');
    return tol === undefined ? job : { ...job, toleranceUnits: tol };
}
const DLQ_STATUSES = ['pending', 'retrying', 'failed', 'resolved'];
function reqDlqStatus(record, key) {
    const value = reqString(record, key);
    if (!DLQ_STATUSES.includes(value)) {
        throw new InvalidJobPayloadError(`"${key}" must be a dead-letter status`);
    }
    return value;
}
export function parseDeadLetterControlJob(data) {
    const r = asRecord(data);
    return {
        deadLetterId: reqString(r, 'deadLetterId'),
        fromStatus: reqDlqStatus(r, 'fromStatus'),
        toStatus: reqDlqStatus(r, 'toStatus'),
    };
}
const DEPOSIT_WATCH_NETWORKS = ['ETH', 'BNB', 'TRON', 'SOLANA'];
export function parseDepositWatchJob(data) {
    // An empty/absent payload is the normal repeatable-sweep case.
    if (data === undefined || data === null)
        return {};
    const r = asRecord(data);
    const raw = r['networks'];
    if (raw === undefined || raw === null)
        return {};
    if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
        throw new InvalidJobPayloadError('"networks" must be a string[]');
    }
    const networks = raw;
    for (const n of networks) {
        if (!DEPOSIT_WATCH_NETWORKS.includes(n)) {
            throw new InvalidJobPayloadError(`"networks" contains unsupported chain: ${n}`);
        }
    }
    return networks.length === 0 ? {} : { networks: networks };
}
//# sourceMappingURL=payloads.js.map