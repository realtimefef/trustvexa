/**
 * External integration seams for the worker.
 *
 * Background jobs orchestrate domain logic that ultimately touches systems the
 * operator provisions at deploy time: transactional email, web-push delivery,
 * on-chain broadcast/signing, the FX rate provider, the media malware scanner,
 * and the envelope-encryption key store. Each is expressed as a small interface
 * so a real client can be injected per environment.
 *
 * The defaults are deliberately honest "not configured" stubs: until
 * credentials exist, every seam reports `configured: false` and throws
 * {@link IntegrationNotConfiguredError} when invoked. Processors treat that as a
 * retry/dead-letter condition rather than silently reporting success.
 */
import type { KeyProvider } from '@trustvexa/shared/crypto';
export declare class IntegrationNotConfiguredError extends Error {
    readonly integration: string;
    constructor(integration: string, detail?: string);
}
export interface EmailMessage {
    readonly to: string;
    readonly subject: string;
    readonly html: string;
    readonly text?: string | undefined;
}
export interface Mailer {
    readonly configured: boolean;
    send(message: EmailMessage): Promise<void>;
}
export interface WebPushTarget {
    readonly endpoint: string;
    readonly p256dh: string;
    readonly auth: string;
}
export interface PushSender {
    readonly configured: boolean;
    send(target: WebPushTarget, payload: Record<string, unknown>): Promise<void>;
}
export interface BroadcastRequest {
    readonly coin: string;
    readonly network: string;
    readonly toAddress: string;
    readonly amountSmallestUnit: bigint;
}
export interface BroadcastResult {
    readonly txHash: string;
}
export interface ChainBroadcaster {
    readonly configured: boolean;
    broadcast(request: BroadcastRequest): Promise<BroadcastResult>;
}
export interface FxQuoteFetch {
    readonly coin: string;
    readonly fiat: string;
    readonly rate: number;
    readonly source: string;
    readonly sourceRank: number;
    readonly fetchedAt: string;
}
export interface FxProvider {
    readonly configured: boolean;
    fetchQuotes(coin: string, fiat: string): Promise<FxQuoteFetch[]>;
}
export type ScanVerdict = 'clean' | 'infected' | 'unscannable';
export interface MediaScanRequest {
    readonly storageKey: string;
    readonly sha256?: string;
}
export interface MediaScanResult {
    readonly verdict: ScanVerdict;
    readonly detail?: string;
}
export interface MediaScanner {
    readonly configured: boolean;
    scan(request: MediaScanRequest): Promise<MediaScanResult>;
}
/** Bundle of every external seam a processor may need. */
export interface Adapters {
    readonly mailer: Mailer;
    readonly push: PushSender;
    readonly chain: ChainBroadcaster;
    readonly fx: FxProvider;
    readonly scanner: MediaScanner;
    /** DEK resolver for envelope-encrypting dead-letter payloads at rest. */
    readonly keyProvider: KeyProvider;
}
/**
 * Default adapter bundle: every seam reports `configured: false` and throws on
 * use. Real implementations are injected once the operator provisions
 * credentials (SMTP, VAPID, chain RPC + signer, FX provider, scanner, KEK).
 */
export declare function createDefaultAdapters(): Adapters;
//# sourceMappingURL=adapters.d.ts.map