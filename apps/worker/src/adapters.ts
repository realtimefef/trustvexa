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
import nodemailer from 'nodemailer';
import { getPushSender } from '@trustvexa/api/worker-jobs';

export class IntegrationNotConfiguredError extends Error {
  readonly integration: string;
  constructor(integration: string, detail?: string) {
    super(`integration_not_configured:${integration}${detail ? ` (${detail})` : ''}`);
    this.name = 'IntegrationNotConfiguredError';
    this.integration = integration;
  }
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

function unconfigured(integration: string, detail?: string): never {
  throw new IntegrationNotConfiguredError(integration, detail);
}

/**
 * Default adapter bundle: every seam reports `configured: false` and throws on
 * use. Real implementations are injected once the operator provisions
 * credentials (SMTP, VAPID, chain RPC + signer, FX provider, scanner, KEK).
 */
export function createDefaultAdapters(): Adapters {
  const mailHost = process.env.MAIL_HOST;
  const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
  const mailUser = process.env.MAIL_USER;
  const mailPassword = process.env.MAIL_PASSWORD;
  const mailFrom = process.env.MAIL_FROM || 'noreply@trustvexa.com';

  const mailerConfigured = !!(mailHost && mailPort);
  let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  if (mailerConfigured) {
    transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465,
      auth:
        mailUser && mailPassword
          ? {
              user: mailUser,
              pass: mailPassword,
            }
          : undefined,
    });
  }

  return {
    mailer: {
      configured: mailerConfigured,
      send: async (message: EmailMessage) => {
        if (!mailerConfigured || !transporter) {
          unconfigured('mailer', 'MAIL_* credentials');
        }
        await transporter.sendMail({
          from: mailFrom,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
      },
    },
    push: (() => {
      const sender = getPushSender();
      if (!sender.configured) {
        return {
          configured: false,
          send: () => unconfigured('push', 'VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY'),
        };
      }
      return {
        configured: true,
        send: sender.send.bind(sender),
      };
    })(),
    chain: {
      configured: false,
      broadcast: () => unconfigured('chain', 'per-chain RPC endpoint + signer'),
    },
    fx: {
      configured: false,
      fetchQuotes: () => unconfigured('fx', 'FX provider credentials'),
    },
    scanner: {
      configured: false,
      scan: () => unconfigured('scanner', 'media scanner endpoint'),
    },
    keyProvider: {
      getActiveKey: () => unconfigured('encryption', 'TRUSTVEXA_MASTER_KEK'),
      getKeyByVersion: () => unconfigured('encryption', 'TRUSTVEXA_MASTER_KEK'),
    },
  };
}
