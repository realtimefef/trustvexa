/**
 * Solana deposit-watcher adapter, backed by `@solana/web3.js`.
 *
 * `@solana/web3.js` is an OPTIONAL runtime dependency loaded only here through a
 * lazy dynamic `import(variableSpecifier)`, so the worker builds and typechecks
 * with zero new dependencies. If the package is missing the import throws and
 * {@link loadSolanaClient} resolves to `null`, signalling the watcher to skip
 * Solana (manual tx-hash verification remains the fallback).
 *
 * Solana uses commitment (not a confirmation count): a transfer counts as
 * fundable only at `finalized` commitment, surfaced via the `finalized` flag /
 * the literal `'finalized'` confirmation result. Native SOL transfers are
 * detected from the pre/post lamport balance delta of the watched account; SPL
 * token detection is intentionally out of scope for this slice.
 */
import type { ChainClient, ObservedTransfer } from './chain-client.js';

/** Minimal structural view of the `@solana/web3.js` slice we use. */
interface SolSignatureInfo {
  readonly signature: string;
  readonly confirmationStatus?: string | null;
}
interface SolTransactionMeta {
  readonly preBalances: readonly number[];
  readonly postBalances: readonly number[];
}
interface SolTransaction {
  readonly meta: SolTransactionMeta | null;
  readonly transaction: {
    readonly message: {
      // staticAccountKeys (v0) or accountKeys (legacy); we read whichever exists.
      readonly staticAccountKeys?: readonly { toBase58(): string }[];
      readonly accountKeys?: readonly { toBase58(): string }[];
    };
  };
}
interface SolPublicKey {
  toBase58(): string;
}
interface SolConnection {
  getSignaturesForAddress(
    address: SolPublicKey,
    options?: { limit?: number },
  ): Promise<SolSignatureInfo[]>;
  getTransaction(
    signature: string,
    options?: { maxSupportedTransactionVersion?: number },
  ): Promise<SolTransaction | null>;
  getSignatureStatuses(
    signatures: string[],
  ): Promise<{ value: ({ confirmationStatus?: string | null } | null)[] }>;
}
interface Web3Module {
  Connection: new (endpoint: string, commitment?: string) => SolConnection;
  PublicKey: new (value: string) => SolPublicKey;
}

const SIGNATURE_LIMIT = 25;

function accountKeysOf(tx: SolTransaction): readonly { toBase58(): string }[] {
  return tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys ?? [];
}

class SolanaChainClient implements ChainClient {
  readonly network = 'SOLANA' as const;
  private readonly conn: SolConnection;
  private readonly mod: Web3Module;

  constructor(conn: SolConnection, mod: Web3Module) {
    this.conn = conn;
    this.mod = mod;
  }

  async getIncomingTransfers(address: string, coin: string): Promise<ObservedTransfer[]> {
    const pubkey = new this.mod.PublicKey(address);
    const signatures = await this.conn.getSignaturesForAddress(pubkey, {
      limit: SIGNATURE_LIMIT,
    });
    const transfers: ObservedTransfer[] = [];

    for (const sig of signatures) {
      const finalized = sig.confirmationStatus === 'finalized';
      const tx = await this.conn.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (tx?.meta === null || tx?.meta === undefined) continue;

      const keys = accountKeysOf(tx);
      const idx = keys.findIndex((k) => k.toBase58() === address);
      if (idx < 0) continue;

      const pre = tx.meta.preBalances[idx] ?? 0;
      const post = tx.meta.postBalances[idx] ?? 0;
      const delta = BigInt(post) - BigInt(pre);
      if (delta <= 0n) continue; // not an inbound credit

      transfers.push({
        txHash: sig.signature,
        outputIndex: 0,
        coin,
        network: 'SOLANA',
        amountSmallestUnit: delta,
        confirmations: finalized ? 1 : 0,
        finalized,
      });
    }

    return transfers;
  }

  async getConfirmations(txHash: string): Promise<number | 'finalized'> {
    const statuses = await this.conn.getSignatureStatuses([txHash]);
    const status = statuses.value[0];
    if (status === null || status === undefined) return 0; // dropped / unknown
    return status.confirmationStatus === 'finalized' ? 'finalized' : 0;
  }
}

class FailoverSolConnection implements SolConnection {
  private readonly connections: SolConnection[];
  private currentIndex = 0;

  constructor(urls: string[], web3Mod: Web3Module) {
    this.connections = urls.map((url) => new web3Mod.Connection(url, 'finalized'));
  }

  private async executeWithFailover<T>(fn: (conn: SolConnection) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < this.connections.length; i += 1) {
      const idx = (this.currentIndex + i) % this.connections.length;
      const conn = this.connections[idx];
      try {
        const result = await fn(conn!);
        this.currentIndex = idx;
        return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  getSignaturesForAddress(
    address: SolPublicKey,
    options?: { limit?: number },
  ): Promise<SolSignatureInfo[]> {
    return this.executeWithFailover((c) => c.getSignaturesForAddress(address, options));
  }

  getTransaction(
    signature: string,
    options?: { maxSupportedTransactionVersion?: number },
  ): Promise<SolTransaction | null> {
    return this.executeWithFailover((c) => c.getTransaction(signature, options));
  }

  getSignatureStatuses(
    signatures: string[],
  ): Promise<{ value: ({ confirmationStatus?: string | null } | null)[] }> {
    return this.executeWithFailover((c) => c.getSignatureStatuses(signatures));
  }
}

/**
 * Build a Solana client, lazily importing `@solana/web3.js`. Returns `null`
 * when the library is unavailable so the watcher can skip the chain.
 */
export async function loadSolanaClient(rpcUrl: string | string[]): Promise<ChainClient | null> {
  try {
    const specifier = '@solana/web3.js';
    const mod = (await import(specifier)) as unknown as Web3Module;
    const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
    const conn = new FailoverSolConnection(urls, mod);
    return new SolanaChainClient(conn, mod);
  } catch {
    return null;
  }
}
